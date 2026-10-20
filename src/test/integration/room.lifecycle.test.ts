import { describe, it, expect, beforeEach } from 'vitest';
import { useHostStore } from '../../stores/host.store';
import { usePresenterStore } from '../../stores/presenter.store';
import { useParticipantStore } from '../../stores/participant.store';
import {
  createVoteCastEvent,
  createVoteAcceptedEvent,
} from '../../realtime/room.events';

describe('Room Lifecycle & Realtime Synchronization Integration Flow', () => {
  beforeEach(() => {
    // Reset stores
    useHostStore.getState().initRoom('ROOM_INTEG');
    usePresenterStore.getState().resetState('ROOM_INTEG');
    useParticipantStore.getState().initParticipant('ROOM_INTEG');
  });

  it('orchestrates host creation, snapshot sync, voting, closing, and rejection', () => {
    // 1. Host creates room and has initial questions
    const host = useHostStore.getState();
    expect(host.roomId).toBe('ROOM_INTEG');
    expect(host.questions.length).toBeGreaterThan(0);
    const activeQuestion = host.questions[0];

    // 2. Host broadcasts initial room snapshot (voting is open by default for questions with options)
    const initialSnapshot = host.getPublicSnapshot();
    expect(initialSnapshot.pollStatus).toBe('open');
    expect(initialSnapshot.totalAcceptedVotes).toBe(0);

    // Presenter and participant receive the snapshot
    usePresenterStore.getState().applySnapshot(initialSnapshot);
    useParticipantStore.getState().applyRoomSnapshot(initialSnapshot);

    expect(usePresenterStore.getState().currentQuestion?.id).toBe(activeQuestion.id);
    expect(useParticipantStore.getState().currentQuestion?.id).toBe(activeQuestion.id);
    expect(useParticipantStore.getState().pollStatus).toBe('open');

    // 4. Participant casts a vote for option 'B'
    useParticipantStore.getState().selectOption('B');
    useParticipantStore.getState().setPendingAck('B');
    expect(useParticipantStore.getState().selectedOption).toBe('B');
    expect(useParticipantStore.getState().isPendingAck).toBe(true);
    expect(useParticipantStore.getState().acceptedOption).toBeNull();

    const participantId = useParticipantStore.getState().participantId;
    const voteEvent = createVoteCastEvent(
      host.roomId,
      activeQuestion.id,
      participantId,
      'B'
    );

    // 5. Host processes incoming vote
    const processResult = useHostStore.getState().processVote({
      questionId: voteEvent.payload.questionId,
      participantId: voteEvent.payload.participantId,
      optionId: voteEvent.payload.optionId,
    });

    expect(processResult.accepted).toBe(true);
    expect(processResult.updatedCounts?.B).toBe(1);
    expect(processResult.totalVotes).toBe(1);

    // 6. Host broadcasts vote:accepted
    const acceptedEvent = createVoteAcceptedEvent(
      host.roomId,
      activeQuestion.id,
      participantId,
      'B',
      useHostStore.getState().revision,
      processResult.updatedCounts!,
      processResult.totalVotes!
    );

    // Participant receives vote:accepted
    if (acceptedEvent.payload.participantId === participantId) {
      useParticipantStore.getState().confirmAcceptedVote(
        acceptedEvent.payload.optionId,
        acceptedEvent.payload.questionId
      );
    }
    expect(useParticipantStore.getState().acceptedOption).toBe('B');
    expect(useParticipantStore.getState().isPendingAck).toBe(false);

    // Presenter updates with accepted counts
    usePresenterStore.getState().applyVoteAccepted({
      questionId: acceptedEvent.payload.questionId,
      revision: acceptedEvent.payload.revision,
      voteCounts: acceptedEvent.payload.voteCounts,
      totalAcceptedVotes: acceptedEvent.payload.totalAcceptedVotes,
    });
    expect(usePresenterStore.getState().voteCounts.B).toBe(1);
    expect(usePresenterStore.getState().totalAcceptedVotes).toBe(1);

    // 7. Participant changes vote from 'B' to 'A' while open
    useParticipantStore.getState().selectOption('A');
    useParticipantStore.getState().setPendingAck('A');

    const changeVoteResult = useHostStore.getState().processVote({
      questionId: activeQuestion.id,
      participantId: participantId,
      optionId: 'A',
    });

    expect(changeVoteResult.accepted).toBe(true);
    expect(changeVoteResult.updatedCounts?.A).toBe(1);
    expect(changeVoteResult.updatedCounts?.B).toBe(0);
    expect(changeVoteResult.totalVotes).toBe(1);

    useParticipantStore.getState().confirmAcceptedVote('A', activeQuestion.id);
    expect(useParticipantStore.getState().acceptedOption).toBe('A');

    // 8. Host closes voting
    useHostStore.getState().closePoll();
    expect(useHostStore.getState().pollStatus).toBe('closed');
    const closedSnapshot = useHostStore.getState().getPublicSnapshot();
    useParticipantStore.getState().applyRoomSnapshot(closedSnapshot);
    usePresenterStore.getState().applySnapshot(closedSnapshot);

    expect(useParticipantStore.getState().pollStatus).toBe('closed');

    // 9. Subsequent vote attempts are rejected by the host
    const lateVoteResult = useHostStore.getState().processVote({
      questionId: activeQuestion.id,
      participantId: 'another-user',
      optionId: 'C',
    });
    expect(lateVoteResult.accepted).toBe(false);

    // 10. Participant reconnects (simulated fresh sync request)
    const reconnectSnapshot = useHostStore.getState().getPublicSnapshot();
    useParticipantStore.getState().applyRoomSnapshot(reconnectSnapshot);
    expect(useParticipantStore.getState().pollStatus).toBe('closed');
  });
});

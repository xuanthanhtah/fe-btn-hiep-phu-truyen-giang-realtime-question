import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from '../../pages/LandingPage';
import { HostPage } from '../../pages/HostPage';
import { PresenterPage } from '../../pages/PresenterPage';
import { ParticipantPage } from '../../pages/ParticipantPage';
import { useHostStore } from '../../stores/host.store';
import { usePresenterStore } from '../../stores/presenter.store';
import { useParticipantStore } from '../../stores/participant.store';
import { useConnectionStore } from '../../stores/connection.store';

describe('Page Rendering & User Flow Tests', () => {
  beforeEach(() => {
    useConnectionStore.getState().setStatus('connected');
    useHostStore.getState().initRoom('ROOM99');
    usePresenterStore.getState().resetState('ROOM99');
    useParticipantStore.getState().initParticipant('ROOM99');
  });

  it('renders LandingPage with headline, launch CTA, and code join form', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/PulsePoll/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Tạo phòng bình chọn/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nhập mã phòng/i)).toBeInTheDocument();
  });

  it('renders HostPage with room controls, questions, and action buttons', () => {
    render(
      <MemoryRouter initialEntries={['/host/ROOM99']}>
        <Routes>
          <Route path="/host/:roomId" element={<HostPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Host Controller/i)).toBeInTheDocument();
    expect(screen.getAllByText('ROOM99').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Khóa bình chọn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset câu này/i })).toBeInTheDocument();

    // Since voting is open by default, verify clicking Close Voting switches button to Open Voting
    const closeBtn = screen.getByRole('button', { name: /Khóa bình chọn/i });
    fireEvent.click(closeBtn);
    expect(screen.getByRole('button', { name: /Mở bình chọn/i })).toBeInTheDocument();
  });

  it('renders PresenterPage with large question title and option cards', () => {
    render(
      <MemoryRouter initialEntries={['/present/ROOM99']}>
        <Routes>
          <Route path="/present/:roomId" element={<PresenterPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Seed presenter state after mount
    const sampleQuestion = useHostStore.getState().questions[0];
    act(() => {
      usePresenterStore.getState().applySnapshot({
        roomId: 'ROOM99',
        revision: 2,
        currentQuestionIndex: 0,
        totalQuestions: 10,
        currentQuestion: sampleQuestion,
        pollStatus: 'open',
        voteCounts: { A: 2, B: 3, C: 0, D: 1 },
        totalAcceptedVotes: 6,
      });
    });

    expect(screen.getByText(sampleQuestion.title)).toBeInTheDocument();
    expect(screen.getByText(sampleQuestion.options[0].text)).toBeInTheDocument();
    expect(screen.getByText(/6/i)).toBeInTheDocument();
  });

  it('renders ParticipantPage, handles voting tap, and reflects selection', () => {
    render(
      <MemoryRouter initialEntries={['/join/ROOM99']}>
        <Routes>
          <Route path="/join/:roomId" element={<ParticipantPage />} />
        </Routes>
      </MemoryRouter>
    );

    const sampleQuestion = useHostStore.getState().questions[0];
    act(() => {
      useParticipantStore.getState().applyRoomSnapshot({
        roomId: 'ROOM99',
        revision: 2,
        currentQuestionIndex: 0,
        totalQuestions: 10,
        currentQuestion: sampleQuestion,
        pollStatus: 'open',
        voteCounts: { A: 0, B: 0, C: 0, D: 0 },
        totalAcceptedVotes: 0,
      });
      useConnectionStore.getState().setStatus('connected');
    });

    expect(screen.getByText(sampleQuestion.title)).toBeInTheDocument();
    expect(screen.getByText('Đang mở')).toBeInTheDocument();

    // Tap Option B
    const optionBButton = screen.getByText(sampleQuestion.options![1].text).closest('button');
    expect(optionBButton).toBeInTheDocument();
    fireEvent.click(optionBButton!);

    expect(useParticipantStore.getState().selectedOption).toBe('B');
  });

  it('renders open question centered on PresenterPage and ParticipantPage without voting buttons', () => {
    const openQuestion = useHostStore.getState().questions[3]; // Question 4 has options: []
    expect(openQuestion.options?.length ?? 0).toBe(0);

    const { unmount } = render(
      <MemoryRouter initialEntries={['/present/ROOM99']}>
        <Routes>
          <Route path="/present/:roomId" element={<PresenterPage />} />
        </Routes>
      </MemoryRouter>
    );

    act(() => {
      usePresenterStore.getState().applySnapshot({
        roomId: 'ROOM99',
        revision: 3,
        currentQuestionIndex: 3,
        totalQuestions: 10,
        currentQuestion: openQuestion,
        pollStatus: 'open',
        voteCounts: { A: 0, B: 0, C: 0, D: 0 },
        totalAcceptedVotes: 0,
      });
    });

    expect(screen.getByText(openQuestion.title)).toBeInTheDocument();
    expect(screen.queryByText(/lượt bình chọn/i)).not.toBeInTheDocument();
    unmount();

    // Now test ParticipantPage
    render(
      <MemoryRouter initialEntries={['/join/ROOM99']}>
        <Routes>
          <Route path="/join/:roomId" element={<ParticipantPage />} />
        </Routes>
      </MemoryRouter>
    );

    act(() => {
      useParticipantStore.getState().applyRoomSnapshot({
        roomId: 'ROOM99',
        revision: 3,
        currentQuestionIndex: 3,
        totalQuestions: 10,
        currentQuestion: openQuestion,
        pollStatus: 'open',
        voteCounts: { A: 0, B: 0, C: 0, D: 0 },
        totalAcceptedVotes: 0,
      });
    });

    expect(screen.getByText(openQuestion.title)).toBeInTheDocument();
    expect(screen.getByText('Lắng nghe')).toBeInTheDocument();
    // Verify no ABCD option buttons exist
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });
});

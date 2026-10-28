import { describe, it, expect, beforeEach, vi } from 'vitest';
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

    expect(screen.getAllByText(/HiepPhuPoll/i).length).toBeGreaterThan(0);
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

    // Initial state shows Start button
    const startBtns = screen.getAllByRole('button', { name: /Bắt đầu/i });
    expect(startBtns.length).toBeGreaterThan(0);
    fireEvent.click(startBtns[0]);

    // Once started, voting controls become active
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

  it('displays Stage QR Lobby on PresenterPage until Host starts session', () => {
    useHostStore.getState().initRoom('ROOM_STAGE');
    usePresenterStore.getState().resetState('ROOM_STAGE');

    const { unmount } = render(
      <MemoryRouter initialEntries={['/present/ROOM_STAGE']}>
        <Routes>
          <Route path="/present/:roomId" element={<PresenterPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial snapshot broadcasted when not started yet
    const snapshotNotStarted = useHostStore.getState().getPublicSnapshot();
    expect(snapshotNotStarted.currentQuestion).toBeNull();
    act(() => {
      usePresenterStore.getState().applySnapshot(snapshotNotStarted);
    });

    // Verify Stage QR Lobby is visible
    expect(screen.getByText(/Quét mã QR để tham gia bình chọn/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang đón khán giả tham gia/i)).toBeInTheDocument();

    // Host clicks startSession
    act(() => {
      useHostStore.getState().startSession();
    });
    const snapshotStarted = useHostStore.getState().getPublicSnapshot();
    expect(snapshotStarted.currentQuestion).not.toBeNull();

    act(() => {
      usePresenterStore.getState().applySnapshot(snapshotStarted);
    });

    // Verify Question 1 is now displayed
    const q1 = useHostStore.getState().questions[0];
    expect(screen.getByText(q1.title)).toBeInTheDocument();
    expect(screen.queryByText(/Đang đón khán giả tham gia/i)).not.toBeInTheDocument();

    unmount();
  });

  it('renders HostPage with QR badge in action buttons, and can open Settings and Reorder modals', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/host/ROOM99']}>
        <Routes>
          <Route path="/host/:roomId" element={<HostPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify QR badge is inside the action area
    expect(screen.getByText(/Sân khấu đang hiện mã QR/i)).toBeInTheDocument();

    // Verify Settings button is present and opens Settings modal
    const settingBtns = screen.getAllByRole('button', { name: /Cài đặt/i });
    expect(settingBtns.length).toBeGreaterThan(0);
    fireEvent.click(settingBtns[0]);
    expect(screen.getByText(/Cài đặt Font chữ & Bố cục hiển thị/i)).toBeInTheDocument();

    // Close Settings modal
    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất/i }));
    expect(screen.queryByText(/Cài đặt Font chữ & Bố cục hiển thị/i)).not.toBeInTheDocument();

    // Start session to enable Vị trí đáp án button
    const startBtn = screen.getByRole('button', { name: /Bắt đầu/i });
    fireEvent.click(startBtn);

    // Verify Vị trí đáp án button exists and opens Reorder modal
    const reorderBtns = screen.getAllByRole('button', { name: /Vị trí đáp án/i });
    expect(reorderBtns.length).toBeGreaterThan(0);
    fireEvent.click(reorderBtns[0]);
    expect(screen.getByText(/Điều chỉnh vị trí đáp án/i)).toBeInTheDocument();

    // Verify 4 drag handles are present for drag & drop
    const dragHandles = screen.getAllByTitle(/Kéo thả để đổi vị trí/i);
    expect(dragHandles.length).toBe(4);

    // Close Reorder modal
    fireEvent.click(screen.getByRole('button', { name: /Xong/i }));
    expect(screen.queryByText(/Điều chỉnh vị trí đáp án/i)).not.toBeInTheDocument();

    unmount();
  });

  it('auto-loops the grouped critical-thinking questions every 3 seconds from the Questions Manager', () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <MemoryRouter initialEntries={['/host/LOOP01']}>
        <Routes>
          <Route path="/host/:roomId" element={<HostPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Bắt đầu/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Danh sách câu hỏi/i }));

    const loopSwitch = screen.getByRole('switch');
    expect(loopSwitch).toHaveAttribute('aria-checked', 'false');

    // Turning on jumps straight into the loop group (Câu 3)
    fireEvent.click(loopSwitch);
    expect(useHostStore.getState().questions[useHostStore.getState().currentQuestionIndex].id).toBe('q3');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(useHostStore.getState().questions[useHostStore.getState().currentQuestionIndex].id).toBe('q4');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Wraps back to the first question of the group
    expect(useHostStore.getState().questions[useHostStore.getState().currentQuestionIndex].id).toBe('q3');

    unmount();
    vi.useRealTimers();
  });
});

import { z } from 'zod';

export const PROTOCOL_VERSION = '1.0';

export const OptionIdSchema = z.enum(['A', 'B', 'C', 'D']);
export type OptionId = z.infer<typeof OptionIdSchema>;

export const PollStatusSchema = z.enum(['waiting', 'open', 'closed']);
export type PollStatus = z.infer<typeof PollStatusSchema>;

export const PollOptionSchema = z.object({
  id: OptionIdSchema,
  text: z.string().min(1, 'Option text is required').max(500, 'Option text too long'),
});

export const PollQuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  title: z.string().min(1, 'Question title is required').max(1000, 'Question title too long'),
  category: z.string().optional(),
  options: z.array(PollOptionSchema).optional().default([]),
});

export const VoteCountsSchema = z.object({
  A: z.number().int().nonnegative(),
  B: z.number().int().nonnegative(),
  C: z.number().int().nonnegative(),
  D: z.number().int().nonnegative(),
});

export const BaseEventSchema = z.object({
  version: z.literal(PROTOCOL_VERSION).default(PROTOCOL_VERSION),
  eventId: z.string().min(1),
  roomId: z.string().min(1),
  timestamp: z.number().int().positive(),
});

// Event 1: room:state (Host -> Public broadcast snapshot)
export const RoomStateEventSchema = BaseEventSchema.extend({
  type: z.literal('room:state'),
  payload: z.object({
    revision: z.number().int().nonnegative(),
    isStarted: z.boolean().optional(),
    currentQuestionIndex: z.number().int().nonnegative(),
    totalQuestions: z.number().int().nonnegative(),
    currentQuestion: PollQuestionSchema.nullable(),
    pollStatus: PollStatusSchema,
    voteCounts: VoteCountsSchema,
    totalAcceptedVotes: z.number().int().nonnegative(),
  }),
});
export type RoomStateEvent = z.infer<typeof RoomStateEventSchema>;

// Event 2: poll:opened (Host -> Public broadcast)
export const PollOpenedEventSchema = BaseEventSchema.extend({
  type: z.literal('poll:opened'),
  payload: z.object({
    questionId: z.string().min(1),
    revision: z.number().int().nonnegative(),
  }),
});
export type PollOpenedEvent = z.infer<typeof PollOpenedEventSchema>;

// Event 3: poll:closed (Host -> Public broadcast)
export const PollClosedEventSchema = BaseEventSchema.extend({
  type: z.literal('poll:closed'),
  payload: z.object({
    questionId: z.string().min(1),
    revision: z.number().int().nonnegative(),
  }),
});
export type PollClosedEvent = z.infer<typeof PollClosedEventSchema>;

// Event 4: question:changed (Host -> Public broadcast)
export const QuestionChangedEventSchema = BaseEventSchema.extend({
  type: z.literal('question:changed'),
  payload: z.object({
    questionIndex: z.number().int().nonnegative(),
    totalQuestions: z.number().int().nonnegative(),
    currentQuestion: PollQuestionSchema.nullable(),
    revision: z.number().int().nonnegative(),
  }),
});
export type QuestionChangedEvent = z.infer<typeof QuestionChangedEventSchema>;

// Event 5: vote:cast (Participant -> Host)
export const VoteCastEventSchema = BaseEventSchema.extend({
  type: z.literal('vote:cast'),
  payload: z.object({
    questionId: z.string().min(1),
    participantId: z.string().min(1),
    optionId: OptionIdSchema,
  }),
});
export type VoteCastEvent = z.infer<typeof VoteCastEventSchema>;

// Event 6: vote:accepted (Host -> Public broadcast)
export const VoteAcceptedEventSchema = BaseEventSchema.extend({
  type: z.literal('vote:accepted'),
  payload: z.object({
    questionId: z.string().min(1),
    participantId: z.string().min(1),
    optionId: OptionIdSchema,
    revision: z.number().int().nonnegative(),
    voteCounts: VoteCountsSchema,
    totalAcceptedVotes: z.number().int().nonnegative(),
  }),
});
export type VoteAcceptedEvent = z.infer<typeof VoteAcceptedEventSchema>;

// Event 7: room:reset (Host -> Public broadcast)
export const RoomResetEventSchema = BaseEventSchema.extend({
  type: z.literal('room:reset'),
  payload: z.object({
    revision: z.number().int().nonnegative(),
  }),
});
export type RoomResetEvent = z.infer<typeof RoomResetEventSchema>;

// Event 8: room:sync_request (Participant/Presenter -> Host)
export const RoomSyncRequestEventSchema = BaseEventSchema.extend({
  type: z.literal('room:sync_request'),
  payload: z.object({
    participantId: z.string().min(1).optional(),
  }),
});
export type RoomSyncRequestEvent = z.infer<typeof RoomSyncRequestEventSchema>;

// Union schema for all valid protocol events
export const RealtimeEventSchema = z.discriminatedUnion('type', [
  RoomStateEventSchema,
  PollOpenedEventSchema,
  PollClosedEventSchema,
  QuestionChangedEventSchema,
  VoteCastEventSchema,
  VoteAcceptedEventSchema,
  RoomResetEventSchema,
  RoomSyncRequestEventSchema,
]);

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;

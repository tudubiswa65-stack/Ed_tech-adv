'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Modal, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/context/ToastContext';

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  order_index: number;
}

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimitSecs, setTimeLimitSecs] = useState(3600);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testId, setTestId] = useState<string>('');

  // Ref flag: set to true after a successful submission so that the
  // beforeunload guard does not interfere with the redirect to results.
  const isSubmittedRef = useRef(false);

  // Refs that give the timer's interval callback access to up-to-date state
  // without needing to rebuild the interval on every state change.
  const answersRef = useRef(answers);
  const testIdRef = useRef(testId);
  const timeLimitSecsRef = useRef(timeLimitSecs);
  const timeLeftRef = useRef(timeLeft);
  answersRef.current = answers;
  testIdRef.current = testId;
  timeLimitSecsRef.current = timeLimitSecs;
  timeLeftRef.current = timeLeft;

  // Start test
  useEffect(() => {
    const startTest = async () => {
      try {
        const response = await apiClient.post(`/student/tests/${params.id}/start`);
        const responseData = (response.data as any)?.success ? (response.data as any).data : response.data;
        setQuestions(responseData.questions);
        setTestId(responseData.test_id);
        // Store both the limit (for time_taken_secs) and the countdown.
        const limitSecs = (responseData.time_limit_mins || 60) * 60;
        setTimeLimitSecs(limitSecs);
        setTimeLeft(limitSecs);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to start test');
        router.push('/tests');
      } finally {
        setLoading(false);
      }
    };

    startTest();
  }, [params.id, router, toast]);

  const handleAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Core submit — accepts explicit snapshots so it is safe to call from both
  // the timer (via refs) and from the modal confirm button (via state).
  const doSubmit = useCallback(
    async (
      currentAnswers: Record<string, string>,
      currentTestId: string,
      limitSecs: number,
      remaining: number,
    ) => {
      setSubmitting(true);
      setShowSubmitModal(false);

      const answersArray = Object.entries(currentAnswers).map(([questionId, selectedOption]) => ({
        question_id: questionId,
        selected_option: selectedOption,
      }));

      try {
        const response = await apiClient.post(`/student/tests/${currentTestId}/submit`, {
          answers: answersArray,
          time_taken_secs: limitSecs - remaining,
        });

        const responseData = (response.data as any)?.success ? (response.data as any).data : response.data;
        // Lift the beforeunload guard before navigating so the redirect is clean.
        isSubmittedRef.current = true;
        router.push(`/results/${responseData.result.id}`);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to submit test');
      } finally {
        setSubmitting(false);
      }
    },
    [router, toast],
  );

  // Opens the confirmation modal (triggered by the Submit button).
  const handleSubmit = () => {
    setShowSubmitModal(true);
  };

  // Called by the "Submit Now" button inside the modal.
  const handleConfirmSubmit = () => {
    doSubmit(answers, testId, timeLimitSecs, timeLeft);
  };

  // Timer — auto-submit when time expires.
  // We read state via refs so the interval callback is never stale and
  // re-creating the interval on every tick is avoided.
  useEffect(() => {
    if (loading) return;
    // Use the ref so this effect doesn't need timeLeft in its deps
    // (adding it would restart the 1-second interval on every tick).
    if (timeLimitSecsRef.current <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit: use ref values so the closure is always current.
          doSubmit(
            answersRef.current,
            testIdRef.current,
            timeLimitSecsRef.current,
            0,
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, doSubmit]);

  // Prevent the student from accidentally leaving during a test.
  // The guard is lifted (via isSubmittedRef) once submission succeeds so
  // the router.push() to the results page is never blocked.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmittedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-700">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-slate-300">Loading test...</p>
        </div>
      </div>
    );
  }

  const answered = Object.keys(answers).length;
  const unanswered = questions.length - answered;
  const marked = markedForReview.size;

  // Collect 1-based question positions that have not been answered yet so we
  // can tell the student exactly which questions still need attention.
  const unansweredPositions = questions
    .map((q, idx) => (!answers[q.id] ? idx + 1 : null))
    .filter((n): n is number => n !== null);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-700">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Test in Progress</h1>
          <div className="flex items-center gap-4">
            <div
              className={`text-2xl font-bold font-mono ${
                timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-900'
              } dark:text-slate-100`}
            >
              {formatTime(timeLeft)}
            </div>
            <Button onClick={() => handleSubmit()} loading={submitting}>
              Submit Test
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Question Navigator */}
        <aside className="w-20 md:w-32 shrink-0">
          <div className="bg-white rounded-base shadow p-3 sticky top-24 dark:bg-slate-800">
            <p className="text-sm font-medium text-gray-700 mb-2 text-center dark:text-slate-200">Questions</p>
            <div className="grid grid-cols-4 md:grid-cols-5 gap-1">
              {questions.map((q, index) => {
                const isAnswered = answers[q.id];
                const isMarked = markedForReview.has(q.id);
                const isCurrent = index === currentIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-7 h-7 text-xs font-medium rounded transition-colors ${
                      isCurrent
                        ? 'ring-2 ring-offset-1'
                        : ''
                    } ${
                      isMarked
                        ? 'bg-amber-100 text-amber-800'
                        : isAnswered
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-600'
                    } dark:text-slate-300 dark:bg-slate-700`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {currentQuestion && (
            <div className="bg-white rounded-base shadow p-6 dark:bg-slate-800">
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2 dark:text-slate-400">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                  {currentQuestion.question_text}
                </h2>
              </div>

              <div className="space-y-3">
                {['a', 'b', 'c', 'd'].map((option) => {
                  const optionKey = `option_${option}` as keyof Question;
                  const optionText = currentQuestion[optionKey];
                  const isSelected = answers[currentQuestion.id] === option;

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                      className={`w-full p-4 text-left rounded-base border-2 transition-colors ${
                        isSelected
                          ? 'border-current bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } dark:bg-slate-800 dark:border-slate-600`}
                      style={isSelected ? { borderColor: 'var(--color-primary)' } : {}}
                    >
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-sm font-medium mr-3 dark:bg-slate-600">
                        {option.toUpperCase()}
                      </span>
                      {optionText}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => handleMarkForReview(currentQuestion.id)}
                  className={`text-sm ${
                    markedForReview.has(currentQuestion.id)
                      ? 'text-amber-600'
                      : 'text-gray-500 hover:text-gray-700'
                  } dark:text-slate-200`}
                >
                  {markedForReview.has(currentQuestion.id) ? '★ Marked for Review' : '☆ Mark for Review'}
                </button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(currentIndex - 1)}
                  >
                    Previous
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={() => handleSubmit()}>
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Test?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-slate-300">Are you sure you want to submit your test?</p>
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-base text-center dark:bg-slate-800">
            <div>
              <p className="text-2xl font-bold text-green-600">{answered}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Answered</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{marked}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Marked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{unanswered}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400">Unanswered</p>
            </div>
          </div>
          {unansweredPositions.length > 0 && (
            <div className="rounded-base border border-amber-300 bg-amber-50 p-3 dark:bg-amber-900/20 dark:border-amber-700">
              <p className="text-amber-700 text-sm font-medium dark:text-amber-400">
                ⚠️ The following question(s) have not been answered:
              </p>
              <p className="text-amber-600 text-sm mt-1 dark:text-amber-300">
                {unansweredPositions.map((n) => `Q${n}`).join(', ')}
              </p>
              <p className="text-amber-600 text-xs mt-2 dark:text-amber-400">
                You can still go back and answer them before submitting.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowSubmitModal(false)}>
              Continue Test
            </Button>
            <Button className="flex-1" onClick={handleConfirmSubmit} loading={submitting}>
              Submit Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { Message } from './DeveloperPromptingPanel';

interface DeveloperChatModalProps {
  isOpen: boolean;
  developer: string;
  apiType: 'reservation' | 'checkin';
  initialMessages: Message[];
  currentTime: string;
  onClose: () => void;
}

const DeveloperChatModal: React.FC<DeveloperChatModalProps> = ({
  isOpen,
  developer,
  apiType,
  initialMessages,
  currentTime,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 초기 메시지 동기화
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // 시뮬레이션된 시간을 Date 객체로 변환하는 함수
  const getSimulatedDateTime = (): Date => {
    if (!currentTime) return new Date();

    const [hours, minutes, seconds] = currentTime.split(':').map(Number);
    const simulatedDate = new Date();
    simulatedDate.setHours(hours, minutes, seconds || 0, 0);
    return simulatedDate;
  };

  // 자동 스크롤
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 모달이 열릴 때 입력 필드에 포커스
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 자동 답변 생성 함수
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // 실제 ChatGPT API 호출 대신 시뮬레이션된 응답
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 3000),
    );

    if (userMessage.includes('예약 등록 API')) {
      return `예약 등록 API 구현을 도와드리겠습니다. 다음과 같이 구현하시면 됩니다:

## 1. ReservationService 구현

\`\`\`java
@Service
@Transactional
public class ReservationService {
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    @Autowired
    private SeatRepository seatRepository;
    
    public RegisterReservationOutDto registerReservation(RegisterReservationInDto request) {
        // 1. 데이터 형식 검증
        validateDateTimeFormat(request.getDate(), request.getStartTime(), request.getEndTime());
        
        // 2. 시간 유효성 검증
        validateTimeValidity(request.getDate(), request.getStartTime(), request.getEndTime());
        
        // 3. 좌석 상태 검증
        validateSeatStatus(request.getSeatId());
        
        // 4. 예약 중복 검증
        validateReservationConflict(request.getSeatId(), request.getDate(), request.getStartTime(), request.getEndTime());
        
        // 5. 예약 시간 제한 검증
        validateReservationTimeLimit(request.getDate(), request.getStartTime(), request.getEndTime());
        
        // 6. 예약 저장
        Reservation reservation = new Reservation();
        reservation.setSeatId(request.getSeatId());
        reservation.setDate(request.getDate());
        reservation.setStartTime(request.getStartTime());
        reservation.setEndTime(request.getEndTime());
        reservation.setStatus("PENDING");
        
        reservationRepository.save(reservation);
        
        return new RegisterReservationOutDto("RS001", "예약이 성공적으로 등록되었습니다.");
    }
}
\`\`\`

이렇게 구현하시면 모든 제약사항을 만족하는 예약 등록 API가 완성됩니다. 추가로 궁금한 점이 있으시면 언제든 말씀해 주세요!`;
    } else if (userMessage.includes('체크인 API')) {
      return `체크인 API 구현을 도와드리겠습니다. 다음과 같이 구현하시면 됩니다:

## 1. SeatService 구현

\`\`\`java
@Service
@Transactional
public class SeatService {
    
    @Autowired
    private SeatRepository seatRepository;
    
    @Autowired
    private ReservationRepository reservationRepository;
    
    public CheckInSeatOutDto checkInSeat(CheckinSeatInDto request) {
        // 1. 예약 정보 조회
        Reservation reservation = reservationRepository.findById(request.getReservationId())
            .orElseThrow(() -> new BusinessException("RE003", "존재하지 않는 예약입니다."));
        
        // 2. 예약 상태 검증
        if (!"RESERVED".equals(reservation.getStatus())) {
            throw new BusinessException("RE003", "체크인할 수 없는 예약 상태입니다.");
        }
        
        // 3. 좌석 정보 조회
        Seat seat = seatRepository.findById(reservation.getSeatId())
            .orElseThrow(() -> new BusinessException("RE003", "존재하지 않는 좌석입니다."));
        
        // 4. 좌석 상태 검증
        if (!"AVAILABLE".equals(seat.getStatus())) {
            throw new BusinessException("RE003", "사용할 수 없는 좌석입니다.");
        }
        
        // 5. 상태 변경
        reservation.setStatus("IN_USE");
        seat.setStatus("UNAVAILABLE");
        
        reservationRepository.save(reservation);
        seatRepository.save(seat);
        
        return new CheckInSeatOutDto("RS003", "체크인이 성공적으로 완료되었습니다.");
    }
}
\`\`\`

이렇게 구현하시면 모든 제약사항을 만족하는 체크인 API가 완성됩니다. 추가로 궁금한 점이 있으시면 언제든 말씀해 주세요!`;
    }

    return `안녕하세요! 개발 관련 질문이 있으시면 언제든 말씀해 주세요. 
     
코드 구현, 디버깅, 아키텍처 설계 등 다양한 개발 관련 도움을 드릴 수 있습니다. 
구체적인 요구사항이나 문제점을 알려주시면 더 정확한 도움을 드릴 수 있습니다.`;
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    // 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      isUser: true,
      timestamp: getSimulatedDateTime(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // AI 응답 생성
      const aiResponse = await generateAIResponse(text);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        isUser: false,
        timestamp: getSimulatedDateTime(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.',
        isUser: false,
        timestamp: getSimulatedDateTime(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-5xl h-[85vh] bg-white rounded-lg shadow-2xl flex flex-col m-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                {developer.split('@')[0]} - AI 어시스턴트
              </h3>
              <span className="text-sm text-gray-500 bg-blue-100 px-3 py-1 rounded-full">
                {apiType === 'reservation' ? '예약 등록 API' : '체크인 API'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-lg">
                AI 어시스턴트가 도움을 드릴 준비가 되었습니다!
              </p>
              <p className="text-sm text-gray-400 mt-2">
                개발 관련 질문을 입력해보세요.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} w-full`}>
              <div
                className={`max-w-[75%] rounded-lg px-6 py-4 text-sm break-words overflow-hidden ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere leading-relaxed">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-2 ${
                    message.isUser ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-6 py-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-4">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            ESC 키를 누르면 창을 닫을 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperChatModal;

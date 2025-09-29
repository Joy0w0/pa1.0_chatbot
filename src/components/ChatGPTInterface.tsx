import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatGPTInterfaceProps {
  isVisible: boolean;
  onClose: () => void;
  initialPrompt?: string;
  currentTime?: string; // 시뮬레이션된 현재 시간
}

const ChatGPTInterface: React.FC<ChatGPTInterfaceProps> = ({
  isVisible,
  onClose,
  initialPrompt = '',
  currentTime = '16:00:00',
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // 초기 프롬프트가 있으면 자동으로 입력하고 전송
  useEffect(() => {
    if (initialPrompt && isVisible) {
      setInputValue(initialPrompt);
      // 약간의 지연 후 자동 전송
      setTimeout(() => {
        handleSendMessage(initialPrompt);
      }, 1000);
    }
  }, [initialPrompt, isVisible]);

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
    
    private void validateDateTimeFormat(String date, String startTime, String endTime) {
        // 날짜 형식 검증 (yyyy-MM-dd)
        if (!date.matches("\\\\d{4}-\\\\d{2}-\\\\d{2}")) {
            throw new BusinessException("REO01", "날짜 형식이 올바르지 않습니다.");
        }
        
        // 시간 형식 검증 (HH:mm)
        if (!startTime.matches("\\\\d{2}:\\\\d{2}") || !endTime.matches("\\\\d{2}:\\\\d{2}")) {
            throw new BusinessException("REO01", "시간 형식이 올바르지 않습니다.");
        }
    }
    
    private void validateTimeValidity(String date, String startTime, String endTime) {
        LocalDate reservationDate = LocalDate.parse(date);
        LocalTime start = LocalTime.parse(startTime);
        LocalTime end = LocalTime.parse(endTime);
        
        // 종료 시간이 시작 시간보다 과거인지 확인
        if (end.isBefore(start)) {
            throw new BusinessException("REO01", "종료 시간은 시작 시간보다 과거일 수 없습니다.");
        }
        
        // 예약 시간이 현재보다 과거인지 확인
        LocalDateTime reservationDateTime = LocalDateTime.of(reservationDate, start);
        if (reservationDateTime.isBefore(LocalDateTime.now())) {
            throw new BusinessException("REO01", "예약 시간은 현재보다 과거일 수 없습니다.");
        }
    }
    
    private void validateSeatStatus(int seatId) {
        Seat seat = seatRepository.findById(seatId);
        if (seat == null || "BROKEN".equals(seat.getStatus())) {
            throw new BusinessException("RE003", "사용할 수 없는 좌석입니다.");
        }
    }
    
    private void validateReservationConflict(int seatId, String date, String startTime, String endTime) {
        List<Reservation> existingReservations = reservationRepository.findConflictingReservations(
            seatId, date, startTime, endTime
        );
        
        if (!existingReservations.isEmpty()) {
            throw new BusinessException("RE002", "해당 시간에 이미 예약된 좌석입니다.");
        }
    }
    
    private void validateReservationTimeLimit(String date, String startTime, String endTime) {
        // 해당 날짜의 총 예약 시간 계산
        LocalTime start = LocalTime.parse(startTime);
        LocalTime end = LocalTime.parse(endTime);
        Duration duration = Duration.between(start, end);
        
        if (duration.toHours() > 8) {
            throw new BusinessException("RE004", "하루 최대 예약 시간은 8시간입니다.");
        }
    }
}
\`\`\`

## 2. Repository 구현

\`\`\`java
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    
    @Query("SELECT r FROM Reservation r WHERE r.seatId = :seatId AND r.date = :date " +
           "AND r.status IN ('RESERVED', 'IN_USE') " +
           "AND ((r.startTime <= :startTime AND r.endTime > :startTime) OR " +
           "(r.startTime < :endTime AND r.endTime >= :endTime) OR " +
           "(r.startTime >= :startTime AND r.endTime <= :endTime))")
    List<Reservation> findConflictingReservations(
        @Param("seatId") int seatId,
        @Param("date") String date,
        @Param("startTime") String startTime,
        @Param("endTime") String endTime
    );
}
\`\`\`

## 3. SQL 쿼리 (RESERVATION.xml)

\`\`\`xml
<mapper namespace="com.example.repository.ReservationRepository">
    <select id="findConflictingReservations" resultType="Reservation">
        SELECT * FROM reservations 
        WHERE seat_id = #{seatId} 
        AND date = #{date}
        AND status IN ('RESERVED', 'IN_USE')
        AND (
            (start_time &lt;= #{startTime} AND end_time > #{startTime}) OR
            (start_time &lt; #{endTime} AND end_time >= #{endTime}) OR
            (start_time >= #{startTime} AND end_time &lt;= #{endTime})
        )
    </select>
</mapper>
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
        
        // 5. 직원 ID 검증 (현재 로그인한 사용자와 예약자 일치 확인)
        String currentEmployeeId = getCurrentEmployeeId(); // 현재 로그인한 직원 ID 조회
        if (!currentEmployeeId.equals(reservation.getEmployeeId())) {
            throw new BusinessException("RE003", "본인의 예약만 체크인할 수 있습니다.");
        }
        
        // 6. 상태 변경
        reservation.setStatus("IN_USE");
        seat.setStatus("UNAVAILABLE");
        
        reservationRepository.save(reservation);
        seatRepository.save(seat);
        
        return new CheckInSeatOutDto("RS003", "체크인이 성공적으로 완료되었습니다.");
    }
    
    private String getCurrentEmployeeId() {
        // 현재 로그인한 사용자의 ID를 반환하는 로직
        // SecurityContext나 세션에서 가져오는 방식으로 구현
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
\`\`\`

## 2. Repository 구현

\`\`\`java
@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    // 기본 CRUD 메서드는 JpaRepository에서 제공
}

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    // 기본 CRUD 메서드는 JpaRepository에서 제공
}
\`\`\`

## 3. SQL 쿼리 (SEAT.xml)

\`\`\`xml
<mapper namespace="com.example.repository.SeatRepository">
    <update id="updateSeatStatus">
        UPDATE seats 
        SET status = #{status}, 
            updated_at = NOW()
        WHERE id = #{seatId}
    </update>
</mapper>
\`\`\`

## 4. SQL 쿼리 (RESERVATION.xml)

\`\`\`xml
<mapper namespace="com.example.repository.ReservationRepository">
    <update id="updateReservationStatus">
        UPDATE reservations 
        SET status = #{status}, 
            updated_at = NOW()
        WHERE id = #{reservationId}
    </update>
</mapper>
\`\`\`

## 5. DTO 클래스들

\`\`\`java
@Data
public class CheckinSeatInDto {
    private int reservationId;
}

@Data
public class CheckInSeatOutDto {
    private String code;
    private String message;
    
    public CheckInSeatOutDto(String code, String message) {
        this.code = code;
        this.message = message;
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

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-white rounded-lg shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              AIDD 개발 어시스턴트
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <svg
              className="w-5 h-5"
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
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
              <p>개발 관련 질문을 입력해보세요!</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} w-full`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 break-words overflow-hidden ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
                  {message.content}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    message.isUser ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
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
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
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
        </div>
      </div>
    </div>
  );
};

export default ChatGPTInterface;

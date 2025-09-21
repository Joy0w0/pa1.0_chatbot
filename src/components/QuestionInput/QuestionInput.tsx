import InputBtn from './InputBtn';

interface QuestionInputProps {
  onClick?: () => void;
}

function QuestionInput({ onClick }: QuestionInputProps) {
  return (
    <div className="relative w-[768px] flex">
      <input
        type="text"
        className="w-full h-[55px] border-[1px] border-[#61c5fa] rounded-full px-4 focus:placeholder:opacity-0 pr-[60px] outline-none focus:ring-2 focus:ring-[#61c5fa]"
        placeholder="ChatBot에게 메시지쓰기"
      />
      <InputBtn onClick={onClick} />
    </div>
  );
}

export default QuestionInput;

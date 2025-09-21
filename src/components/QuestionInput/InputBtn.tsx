import arrowImage from '../../assets/images/arrow.png';

interface InputBtnProps {
  onClick?: () => void;
}

function InputBtn({ onClick }: InputBtnProps) {
  return (
    <button
      onClick={onClick}
      className="absolute right-2 top-1/2 -translate-y-1/2 w-[45px] h-[45px] bg-[#6dedd4] rounded-3xl flex items-center justify-center hover:opacity-80 transition">
      <img src={arrowImage} alt="Arrow" className="w-[30px] h-[30px]" />
    </button>
  );
}

export default InputBtn;

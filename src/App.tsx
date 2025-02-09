import './index.css';
import QuestionInput from './components/QuestionInput/QuestionInput';
import QuestionBox from './components/QuestionBox/QuestionBox';
import AnswerBox from './components/AnswerBox/AnswerBox';

function App() {
  return (
    <div className="flex justify-center w-full h-full">
      <div className="w-[860px] h-[900px] bg-[#d3efff] flex flex-col justify-between">
        <div className="flex justify-end">
          <QuestionBox />
        </div>
        <AnswerBox />
        <div className="flex-grow" />
        <div className="flex justify-center pb-[200px]">
          <QuestionInput />
        </div>
      </div>
    </div>
  );
}

export default App;

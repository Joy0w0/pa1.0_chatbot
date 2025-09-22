// import { useState } from 'react';
// import './index.css';
// import QuestionInput from './components/QuestionInput/QuestionInput';
// import QuestionBox from './components/QuestionBox/QuestionBox';
// import AnswerBox from './components/AnswerBox/AnswerBox';

// function App() {
//   const [step, setStep] = useState(0); // 0: 초기 상태, 1: QuestionBox, 2: AnswerBox

//   const handleNextStep = () => {
//     setStep((prev) => (prev === 2 ? 0 : prev + 1)); // 2까지 가면 다시 0으로 리셋
//   };

//   return (
//     <div className="flex items-center justify-center w-full h-screen">
//       <div className="w-[860px] h-[900px] bg-[#d3efff] flex flex-col justify-between pt-10">
//         {step >= 1 && (
//           <div className="flex justify-end mt-auto fade-in">
//             <QuestionBox />
//           </div>
//         )}

//         {step >= 2 && (
//           <div className="fade-in">
//             <AnswerBox />
//           </div>
//         )}

//         <div className="flex-grow" />
//         <div className="flex justify-center pb-20">
//           <QuestionInput onClick={handleNextStep} />
//         </div>
//       </div>
//     </div>
//   );
// }

// export default App;

import AIDDMonitoringTool from './components/AIDDMonitoringTool';

export default function Home() {
  return (
    <main>
      <AIDDMonitoringTool />
    </main>
  );
}

import profile from '../../assets/images/profile.png';

function AnswerBox() {
  return (
    <div className="rounded-2xl p-4 m-4 w-[680px] h-auto bg-white">
      <p className="font-normal text-[15px]">
        신한은행의 데이터 플랫폼 구축(H/W) 프로젝트에 적합한 데이터 전문가를
        추천하기 위해서는 관련 프로젝트를 경험하거나 직무 및 Skill-Set 정보가
        중요합니다. 현재 추천드리는 인원은 1명이며 추천사유는 다음과 같습니다.
      </p>

      <div className="py-2">
        <p className="text-base font-bold text-[#0e6ca5]">
          1. 강학석 책임 (Data Scientist)
        </p>

        <p className="pl-4 font-semibold text-[15px] text-[#0e6ca5]">
          D&A사업부 D&A Tech Insight추진단 데이터플랫폼Arch팀
        </p>
      </div>

      <div className="flex flex-col">
        <div className="flex flex-row items-end">
          <img src={profile} alt="Profile" className="w-auto h-[120px] pr-2" />
          <p className="text-[15px] font-bold align-bottom">
            이 인원은 빅데이터 산업과 관련된 풍부한 기술 스펙트럼을 갖 추고
            있어서 데이터 모델링부터 시각화까지 전반적인 프로젝 트 수행에 있어
            큰 도움이 될 것으로 판단됩니다.
          </p>
        </div>

        <div className="mt-4 w-full h-auto rounded-2xl p-4 bg-[#ECECEC]">
          <p className="text-[12px] font-semibold">1. Skill Set</p>
          <p className="text-[12px] font-semibold ml-3">
            • 데이터 모델링 - DataWarehouses, 워크플로우 스케줄링, AWS
            Infra(랜딩존/ 서버/스토리지/ 네트워크)
          </p>

          <p className="text-[12px] font-semibold">2. 투입 이력</p>
          <p className="text-[12px] font-semibold ml-3">
            • 2024.07.15 - 2024.10.31 (108일) [open 24] 메리츠화재 데이터레이크
            구축
          </p>
          <p className="text-[12px] font-semibold ml-3">
            • 2024.01.01 ~ 2025.12.31 (730일) SBP 유지보수
          </p>
          <p className="text-[12px] font-semibold ml-3">
            • 2023.05.01 ~ 2023.11.30 (213일) 우리은행 고객 데이터 플랫품 시스템
            구축
          </p>
        </div>
      </div>
    </div>
  );
}

export default AnswerBox;

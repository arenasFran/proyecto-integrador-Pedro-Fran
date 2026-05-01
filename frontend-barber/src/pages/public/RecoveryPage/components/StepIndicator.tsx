interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string }[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center border-2"
              style={{
                backgroundColor: index + 1 <= currentStep ? '#FF5C00' : '#242424',
                borderColor: index + 1 <= currentStep ? '#FF5C00' : '#282828',
              }}
            >
              <span className="text-[14px] font-medium text-white">
                {index + 1}
              </span>
            </div>
            <span className="text-[12px] text-[#8A8A8A] mt-2">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className="w-12 h-[2px] mx-2"
              style={{
                backgroundColor: index + 1 < currentStep ? '#FF5C00' : '#282828',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
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
             <span className="mt-2 max-w-[76px] text-center text-[10px] text-[#8A8A8A] sm:max-w-none sm:text-[12px]">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <div
               className="mx-1 h-[2px] w-4 sm:mx-2 sm:w-12"
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

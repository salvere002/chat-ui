import { memo } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface BranchData {
  hasBranches: boolean;
  totalBranches: number;
  currentBranchIndex: number;
  actualCurrentBranchIndex: number;
}

interface BranchNavigatorProps {
  branchData: BranchData;
  onPreviousBranch: () => void;
  onNextBranch: () => void;
}

const BranchNavigator = memo<BranchNavigatorProps>(({ branchData, onPreviousBranch, onNextBranch }) => {
  const { hasBranches, totalBranches, actualCurrentBranchIndex } = branchData;
  
  if (!hasBranches || totalBranches <= 1) {
    return null;
  }

  return (
    <div className="flex items-center mt-1 px-1 text-xs gap-2">
      <div className="flex items-center gap-1 bg-bg-secondary border border-border-secondary rounded-md p-1">
        <button 
          className="flex items-center justify-center w-5 h-5 rounded bg-transparent border-none text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
          onClick={onPreviousBranch}
          disabled={actualCurrentBranchIndex <= 0}
          title="Previous branch"
        >
          <FaChevronLeft className="text-[10px]" />
        </button>
        <span className="text-xs text-text-secondary font-medium min-w-[24px] text-center px-1">
          {actualCurrentBranchIndex + 1}/{totalBranches}
        </span>
        <button 
          className="flex items-center justify-center w-5 h-5 rounded bg-transparent border-none text-text-tertiary cursor-pointer transition-all duration-150 relative overflow-hidden hover:text-accent-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
          onClick={onNextBranch}
          disabled={actualCurrentBranchIndex >= totalBranches - 1}
          title="Next branch"
        >
          <FaChevronRight className="text-[10px]" />
        </button>
      </div>
    </div>
  );
});

BranchNavigator.displayName = 'BranchNavigator';

export default BranchNavigator;
export type { BranchData };
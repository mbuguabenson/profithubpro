import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import AdvancedOverUnderTab from '../smart-trading/components/advanced-over-under-tab';
import DiffersTab from '../smart-trading/components/differs-tab';
import EvenOddAnalysis from '../smart-trading/components/even-odd-analysis';
import MatchesTab from '../smart-trading/components/matches-tab';
import OverUnderAnalysis from '../smart-trading/components/over-under-analysis';
import './analysis-tool.scss';

type TAnalysisSubTab = 'even_odd' | 'over_under' | 'adv_over_under' | 'differs' | 'matches';

const ProAnalysisTool = observer(() => {
    const [active_subtab, setActiveSubtab] = useState<TAnalysisSubTab>('even_odd');

    const renderActiveTab = () => {
        switch (active_subtab) {
            case 'even_odd':
                return <EvenOddAnalysis />;
            case 'over_under':
                return <OverUnderAnalysis />;
            case 'adv_over_under':
                return <AdvancedOverUnderTab />;
            case 'differs':
                return <DiffersTab />;
            case 'matches':
                return <MatchesTab />;
            default:
                return <EvenOddAnalysis />;
        }
    };

    return (
        <div className="pro-analysis-tool flex flex-col h-full bg-[#05080c] text-white p-4 md:p-8">
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 to-amber-500 bg-clip-text text-transparent">
                    Pro Analysis Tool
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">
                    Advanced market analysis strategies for digit trading
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-x-auto scrollbar-none mb-6">
                {(['even_odd', 'over_under', 'adv_over_under', 'differs', 'matches'] as const).map((tab) => {
                    const label = {
                        even_odd: 'Even/Odd',
                        over_under: 'Over/Under',
                        adv_over_under: 'Advanced Over/Under',
                        differs: 'Differs',
                        matches: 'Matches',
                    }[tab];

                    const active = active_subtab === tab;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveSubtab(tab)}
                            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all duration-300 whitespace-nowrap ${
                                active
                                    ? 'bg-gradient-to-r from-pink-500 to-amber-500 text-white shadow-md shadow-pink-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Content Container */}
            <div className="flex-1 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 md:p-6 shadow-2xl overflow-y-auto">
                {renderActiveTab()}
            </div>
        </div>
    );
});

export default ProAnalysisTool;

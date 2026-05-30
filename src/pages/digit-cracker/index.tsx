import { useEffect, useRef,useState } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import TickSelector from '@/components/tick-selector/tick-selector';
import { useStore } from '@/hooks/useStore';
import { TTradeConfig } from '@/lib/digit-trade-engine';
import { TDigitStat } from '@/stores/analysis-store';
import DiffersCracker from './differs-cracker';
import EvenOddCracker from './even-odd-cracker';
import OverUnderCracker from './over-under-cracker';
import MatchesCracker from './matches-cracker';
import './digit-cracker.scss';

const ProDigitCracker = observer(() => {
    const { digit_cracker, client } = useStore();
    const [activeStrategy, setActiveStrategy] = useState<'even_odd' | 'differs' | 'matches' | 'over_under'>('even_odd');
    const [activeLogTab, setActiveLogTab] = useState<'journal' | 'summary'>('journal');
    const [widgetOpen, setWidgetOpen] = useState(true);
    const [widgetPosition, setWidgetPosition] = useState({ x: 32, y: 140 });
    const [isDragging, setIsDragging] = useState(false);
    const [scanMode, setScanMode] = useState<'pattern' | 'risk' | 'strategy'>('pattern');
    const [marketScanEnabled, setMarketScanEnabled] = useState(true);
    const widgetDragRef = useRef<{ x: number; y: number } | null>(null);
    const logRef = useRef<HTMLDivElement>(null);

    const { symbol, digit_stats, is_connected, total_ticks, setTotalTicks, markets, trade_engine, last_digit } =
        digit_cracker;

    if (!trade_engine) return null;

    const { trade_status, is_executing, session_profit, total_profit, logs } = trade_engine;

    // Initialize/Cleanup
    useEffect(() => {
        return () => {
            digit_cracker.dispose();
        };
    }, [digit_cracker]);

    // Auto-scroll logs
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs.length]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (event: MouseEvent) => {
            if (!widgetDragRef.current) return;
            const nextX = event.clientX - widgetDragRef.current.x;
            const nextY = event.clientY - widgetDragRef.current.y;
            setWidgetPosition({
                x: Math.max(16, Math.min(window.innerWidth - 360, nextX)),
                y: Math.max(16, Math.min(window.innerHeight - 220, nextY)),
            });
        };

        const handleEnd = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
        };
    }, [isDragging]);

    const handleWidgetDragStart = (event: any) => {
        widgetDragRef.current = {
            x: event.clientX - widgetPosition.x,
            y: event.clientY - widgetPosition.y,
        };
        setIsDragging(true);
    };

    const handleMarketChange = (newSymbol: string) => {
        digit_cracker.setSymbol(newSymbol);
    };

    const renderDigitReactors = () => {
        return (
            <div className='digit-reactor-grid'>
                {digit_stats.map((stat: TDigitStat) => {
                    const isCurrent = stat.digit === last_digit;
                    const color = isCurrent ? '#f59e0b' : '#6366f1';

                    return (
                        <div key={stat.digit} className={`reactor-core ${isCurrent ? 'is-active' : ''}`}>
                            <svg width='100' height='100' viewBox='0 0 100 100'>
                                <circle
                                    cx='50'
                                    cy='50'
                                    r='45'
                                    fill='none'
                                    stroke='rgba(255, 255, 255, 0.03)'
                                    strokeWidth='4'
                                />
                                <circle
                                    cx='50'
                                    cy='50'
                                    r='45'
                                    fill='none'
                                    stroke={color}
                                    strokeWidth='4'
                                    strokeDasharray={`${(stat.percentage / 100) * 282} 282`}
                                    strokeLinecap='round'
                                    style={{
                                        filter: isCurrent ? `drop-shadow(0 0 8px ${color})` : 'none',
                                        transition: 'all 0.5s ease',
                                    }}
                                />
                            </svg>
                            <div className='core-display'>
                                <span className='digit'>{stat.digit}</span>
                                <span className='pct'>{stat.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderConfigPanel = () => {
        const configKey = `${activeStrategy}_config` as keyof typeof trade_engine;
        const config = trade_engine[configKey] as unknown as TTradeConfig;

        return (
            <div className='config-card'>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                    }}
                >
                    <h3>Config: {activeStrategy.toUpperCase().replace('_', '/')}</h3>
                    {config.runs_count !== undefined && (
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                            Cycle: {config.runs_count}/{config.max_runs}
                        </div>
                    )}
                </div>

                <div className='settings-stack'>
                    <div className='input-group'>
                        <label>Stake ($)</label>
                        <input
                            type='number'
                            step='0.01'
                            value={config.stake}
                            onChange={e =>
                                trade_engine.updateConfig(activeStrategy, 'stake', parseFloat(e.target.value))
                            }
                        />
                    </div>
                    <div className='input-group'>
                        <label>Max Stake ($)</label>
                        <input
                            type='number'
                            step='0.01'
                            value={config.max_stake || 10}
                            onChange={e =>
                                trade_engine.updateConfig(activeStrategy, 'max_stake', parseFloat(e.target.value))
                            }
                        />
                    </div>
                    <div className='input-group'>
                        <label>Stop Loss ($)</label>
                        <input
                            type='number'
                            step='0.01'
                            value={config.max_loss}
                            onChange={e =>
                                trade_engine.updateConfig(activeStrategy, 'max_loss', parseFloat(e.target.value))
                            }
                        />
                    </div>
                    {['over_under', 'matches', 'differs'].includes(activeStrategy) && (
                        <div className='input-group'>
                            <label>Prediction</label>
                            <input
                                type='number'
                                min='0'
                                max='9'
                                value={config.prediction}
                                onChange={e =>
                                    trade_engine.updateConfig(activeStrategy, 'prediction', parseInt(e.target.value))
                                }
                            />
                        </div>
                    )}
                </div>

                <div className='action-btns'>
                    <button
                        className={`btn-launch ${config.is_running ? 'active' : ''}`}
                        onClick={() => trade_engine.toggleStrategy(activeStrategy)}
                    >
                        {config.is_running ? 'Terminate Engine' : 'Initialize Auto-Trade'}
                    </button>
                    <button
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                        }}
                        onClick={() =>
                            trade_engine.executeManualTrade(activeStrategy, symbol, client.currency || 'USD')
                        }
                        disabled={is_executing}
                    >
                        Manual Trade
                    </button>
                </div>
            </div>
        );
    };

    const activeConfig = (trade_engine as any)[`${activeStrategy}_config` as keyof typeof trade_engine] as TTradeConfig;
    const availableMarkets = markets.length > 0 ? markets.flatMap(group => group.items) : [];

    const scanConfidence = Math.round(
        Math.min(
            98,
            activeStrategy === 'even_odd'
                ? Math.max(digit_cracker.percentages.even, digit_cracker.percentages.odd)
                : activeStrategy === 'over_under'
                ? Math.max(digit_cracker.percentages.over, digit_cracker.percentages.under)
                : activeStrategy === 'differs'
                ? Math.max(...digit_stats.map(stat => stat.percentage))
                : Math.max(digit_cracker.matches_ranks.most ?? 0, digit_cracker.matches_ranks.second ?? 0, digit_cracker.matches_ranks.least ?? 0)
        ) + 12
    );

    const scanSignal = (() => {
        if (!activeStrategy) return 'IDLE';
        switch (activeStrategy) {
            case 'even_odd':
                return digit_cracker.percentages.even > digit_cracker.percentages.odd ? 'EVEN EDGE' : 'ODD EDGE';
            case 'over_under':
                return digit_cracker.percentages.over > digit_cracker.percentages.under ? 'OVER PRESSURE' : 'UNDER PRESSURE';
            case 'differs':
                return 'LOW PROBABILITY FAVOURITES';
            case 'matches':
                return `MATCH RANK ${digit_cracker.matches_ranks.most ?? '-'} / ${digit_cracker.matches_ranks.second ?? '-'} `;
            default:
                return 'ANALYZING';
        }
    })();

    const widgetStatus = activeConfig?.is_running ? 'ACTIVE SCAN' : 'STANDBY';

    return (
        <div className='digit-cracker-page'>
            <div className='engine-action-card glass-panel'>
                <div className='engine-info'>
                    <span>ENGINE CONTROL</span>
                    <h2>{activeConfig?.is_running ? 'Trading Engine Active' : 'Ready to fire'}</h2>
                </div>
                <div className='engine-actions'>
                    <button
                        className={`btn-hero ${activeConfig?.is_running ? 'active' : ''}`}
                        onClick={() => trade_engine.toggleStrategy(activeStrategy)}
                    >
                        {activeConfig?.is_running ? 'Stop Engine' : 'Start Engine'}
                    </button>
                    <button
                        className='btn-hero secondary'
                        onClick={() => trade_engine.executeManualTrade(activeStrategy, symbol, client.currency || 'USD')}
                        disabled={is_executing}
                    >
                        Manual Strike
                    </button>
                </div>
            </div>
            {/* Header Area */}
            <div className='cracker-header'>
                <div className='header-main'>
                    <div className='header-title'>
                        <h1>CRACKER V2</h1>
                        <p className='subtitle'>Neural-Link Probabilistic Trading Engine</p>
                    </div>
                </div>
                <div className='header-actions'>
                    <div className='market-selector-v2'>
                        <TickSelector value={total_ticks} onChange={setTotalTicks} label='Sample Size' />
                    </div>
                    <div className='market-selector-v2'>
                        <label>Asset Stream</label>
                        <select
                            className='premium-select'
                            value={symbol}
                            onChange={e => handleMarketChange(e.target.value)}
                        >
                            {availableMarkets.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Reactor Stats */}
            <div className='performance-stats'>
                <div className='stat-card-v3 price-reactor'>
                    <span className='label'>Spot Stream</span>
                    <span className='value glowing'>{digit_cracker.current_price || '0.000'}</span>
                </div>
                <div className='stat-card-v3 digit-reactor'>
                    <span className='label'>Last Digit</span>
                    <span className='value glowing'>{last_digit ?? '-'}</span>
                </div>
                <div className='stat-card-v3 balance-card'>
                    <span className='label'>Account Balance</span>
                    <span className='value'>
                        ${client.balance ? parseFloat(String(client.balance)).toFixed(2) : '0.00'}
                    </span>
                </div>
                <div className='stat-card-v3 connection-card'>
                    <span className='label'>Network Status</span>
                    <span className='value' style={{ color: is_connected ? '#10b981' : '#f43f5e' }}>
                        {is_connected ? 'SYNCHRONIZED' : 'CONNECTION LOST'}
                    </span>
                </div>
            </div>

            {/* Core Analytics */}
            <div className='analytics-hub'>
                <div className='distribution-panel'>
                    <div className='section-header'>
                        <h2>Digit Frequency Reactor</h2>
                        <span className='badge'>
                            {symbol} • {digit_cracker.ticks.length} Samples
                        </span>
                    </div>
                    {renderDigitReactors()}
                </div>

                <div className='side-panels'>
                    <div className='side-panels-tabs glass-panel'>
                        {['even_odd', 'differs', 'matches', 'over_under'].map(s => (
                            <button
                                key={s}
                                onClick={() => setActiveStrategy(s as any)}
                                className={`tab-btn-v2 ${activeStrategy === s ? 'active' : ''}`}
                            >
                                {s.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {activeStrategy === 'even_odd' ? (
                        <EvenOddCracker />
                    ) : activeStrategy === 'over_under' ? (
                        <OverUnderCracker />
                    ) : activeStrategy === 'differs' ? (
                        <DiffersCracker />
                    ) : activeStrategy === 'matches' ? (
                        <MatchesCracker />
                    ) : (
                        renderConfigPanel()
                    )}
                </div>
            </div>

            {/* Trading Floor */}
            <div className='trading-floor'>
                <div className='journal-panel'>
                    <div className='log-tabs'>
                        <button
                            className={activeLogTab === 'journal' ? 'active' : ''}
                            onClick={() => setActiveLogTab('journal')}
                        >
                            JOURNAL
                        </button>
                        <button
                            className={activeLogTab === 'summary' ? 'active' : ''}
                            onClick={() => setActiveLogTab('summary')}
                        >
                            STATISTICS
                        </button>
                        <button onClick={() => trade_engine.clearLogs()} style={{ marginLeft: 'auto', opacity: 0.5 }}>
                            CLEAR
                        </button>
                    </div>
                    <div className='log-viewport' ref={logRef}>
                        {activeLogTab === 'journal' ? (
                            logs.map((log, i) => (
                                <div key={i} className={`log-line ${log.type}`}>
                                    <span className='time'>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                    <span className='message'>{log.message}</span>
                                </div>
                            ))
                        ) : (
                            <div className='strategy-metrics'>
                                <div className='metric-row'>
                                    <span className='m-label'>Session Profit</span>
                                    <span className={`m-value ${session_profit >= 0 ? 'win' : 'loss'}`}>
                                        ${session_profit.toFixed(2)}
                                    </span>
                                </div>
                                <div className='metric-row'>
                                    <span className='m-label'>Total Lifetime Profit</span>
                                    <span className={`m-value ${total_profit >= 0 ? 'win' : 'loss'}`}>
                                        ${total_profit.toFixed(2)}
                                    </span>
                                </div>
                                <div className='metric-row'>
                                    <span className='m-label'>Active Engine Status</span>
                                    <span className='m-value' style={{ color: '#6366f1' }}>
                                        {trade_status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className='strategy-metrics glass-panel'>
                    <div className='metric-row'>
                        <span className='m-label'>Win Rate</span>
                        <span className='m-value' style={{ color: '#10b981' }}>
                            {(() => {
                                const total = logs.filter(l => l.type === 'success' || l.type === 'error').length;
                                const wins = logs.filter(l => l.type === 'success').length;
                                return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
                            })()}
                            %
                        </span>
                    </div>
                    <div className='metric-row'>
                        <span className='m-label'>Status</span>
                        <span className='m-value' style={{ color: is_executing ? '#f59e0b' : '#6366f1' }}>
                            {is_executing ? 'EXECUTING' : 'IDLE'}
                        </span>
                    </div>
                    <button
                        className='btn-launch'
                        style={{ marginTop: 'auto', width: '100%', padding: '1rem', background: '#f43f5e' }}
                        onClick={() => {
                            runInAction(() => {
                                trade_engine.session_profit = 0;
                                trade_engine.total_profit = 0;
                            });
                        }}
                    >
                        RESET PERFORMANCE
                    </button>
                </div>
            </div>

            <div
                className={`ai-scanner-widget glass-panel ${widgetOpen ? 'open' : 'closed'}`}
                style={{ left: widgetPosition.x, top: widgetPosition.y }}
            >
                <div className='widget-handle'>
                    <div className='widget-brand' onMouseDown={handleWidgetDragStart}>
                        <span className='brand-mark'>AI</span>
                        <div>
                            <strong>Scanner</strong>
                            <small>{widgetStatus}</small>
                        </div>
                    </div>
                    <button className='widget-toggle' onClick={() => setWidgetOpen(prev => !prev)}>
                        {widgetOpen ? 'Minimize' : 'Open'}
                    </button>
                </div>

                {widgetOpen ? (
                    <>
                        <div className='widget-summary'>
                            <div>
                                <span>Signal</span>
                                <strong>{scanSignal}</strong>
                            </div>
                            <div>
                                <span>Confidence</span>
                                <strong>{scanConfidence}%</strong>
                            </div>
                        </div>

                        <div className='widget-stats'>
                            <div className='stat-pill'>
                                <span>Market Scan</span>
                                <strong>{marketScanEnabled ? 'ON' : 'OFF'}</strong>
                            </div>
                            <div className='stat-pill'>
                                <span>Last Digit</span>
                                <strong>{last_digit ?? '-'}</strong>
                            </div>
                            <div className='stat-pill'>
                                <span>Trend</span>
                                <strong>{digit_cracker.ticks.slice(-15).join(', ') || 'WAITING'}</strong>
                            </div>
                        </div>

                        <div className='widget-segmented'>
                            {['pattern', 'strategy', 'risk'].map(mode => (
                                <button
                                    key={mode}
                                    className={scanMode === mode ? 'active' : ''}
                                    onClick={() => setScanMode(mode as any)}
                                >
                                    {mode.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div className='widget-panel'>
                            <div className='panel-row'>
                                <label>Strategy</label>
                                <div className='strategy-selector'>
                                    {['even_odd', 'over_under', 'differs', 'matches'].map(strategy => (
                                        <button
                                            key={strategy}
                                            className={activeStrategy === strategy ? 'active' : ''}
                                            onClick={() => setActiveStrategy(strategy as any)}
                                        >
                                            {strategy.replace('_', ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='panel-row'>
                                <label>Stake</label>
                                <input
                                    type='number'
                                    min='0.35'
                                    step='0.05'
                                    value={activeConfig?.stake ?? 0.35}
                                    onChange={e => trade_engine.updateConfig(activeStrategy, 'stake', parseFloat(e.target.value) || 0.35)}
                                />
                            </div>

                            <div className='panel-grid'>
                                <div className='panel-row'>
                                    <label>Take Profit</label>
                                    <input
                                        type='number'
                                        min='0'
                                        step='1'
                                        value={activeConfig?.take_profit ?? 10}
                                        onChange={e => trade_engine.updateConfig(activeStrategy, 'take_profit', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className='panel-row'>
                                    <label>Stop Loss</label>
                                    <input
                                        type='number'
                                        min='0'
                                        step='1'
                                        value={activeConfig?.max_loss ?? 5}
                                        onChange={e => trade_engine.updateConfig(activeStrategy, 'max_loss', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className='panel-row switch-row'>
                                <label>Market Scan</label>
                                <button className={marketScanEnabled ? 'pill active' : 'pill'} onClick={() => setMarketScanEnabled(prev => !prev)}>
                                    {marketScanEnabled ? 'Enabled' : 'Disabled'}
                                </button>
                            </div>

                            <div className='panel-row switch-row'>
                                <label>Martingale</label>
                                <button
                                    className={activeConfig?.use_martingale ? 'pill active' : 'pill'}
                                    onClick={() => trade_engine.updateConfig(activeStrategy, 'use_martingale', !activeConfig?.use_martingale)}
                                >
                                    {activeConfig?.use_martingale ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            <div className='panel-row'>
                                <label>Prediction</label>
                                <input
                                    type='number'
                                    min='0'
                                    max='9'
                                    value={activeConfig?.prediction ?? 0}
                                    onChange={e => trade_engine.updateConfig(activeStrategy, 'prediction', parseInt(e.target.value) || 0)}
                                />
                            </div>

                            <div className='panel-row'>
                                <label>Scan Depth</label>
                                <input
                                    type='range'
                                    min='100'
                                    max='1000'
                                    step='50'
                                    value={total_ticks}
                                    onChange={e => setTotalTicks(parseInt(e.target.value))}
                                />
                                <span className='range-value'>{total_ticks} ticks</span>
                            </div>
                        </div>

                        <div className='widget-actions'>
                            <button className='btn-primary' onClick={() => trade_engine.toggleStrategy(activeStrategy)}>
                                {activeConfig?.is_running ? 'DEACTIVATE SCAN' : 'LAUNCH SCAN'}
                            </button>
                            <button className='btn-secondary' onClick={() => trade_engine.executeManualTrade(activeStrategy, symbol, client.currency || 'USD')} disabled={is_executing}>
                                EXECUTE ENTRY
                            </button>
                        </div>
                    </>
                ) : (
                    <div className='widget-compact'>
                        <span>{scanSignal}</span>
                        <strong>{scanConfidence}%</strong>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ProDigitCracker;

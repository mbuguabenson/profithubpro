import React, { useState, useEffect, useRef } from 'react';
import { localize } from '@deriv-com/translations';
import { generateDerivApiInstance } from '@/external/bot-skeleton/services/api/appId';
import { historyToTicks } from '@/external/bot-skeleton/utils/binary-utils';
import './deep-scan-modal.scss';

interface DeepScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadSignal: (signal: any, settings: any) => void;
}

interface ScanResult {
    symbol: string;
    display_name: string;
    recommendation: string;
    beforeLoss: number;
    afterLoss: number;
    signalType: 'over' | 'under';
    score: number;
}

const DeepScanModal: React.FC<DeepScanModalProps> = ({ isOpen, onClose, onLoadSignal }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [currentSignal, setCurrentSignal] = useState<ScanResult | null>(null);
    const [scanStatus, setScanStatus] = useState('');
    const [showSettingsPrompt, setShowSettingsPrompt] = useState(false);
    const [showIntroPanel, setShowIntroPanel] = useState(true);
    const [settings, setSettings] = useState({
        takeProfit: 10,
        stopLoss: 50,
        martingaleMultiplier: 2.0,
        stake: 1,
    });
    const apiRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen) {
            apiRef.current = generateDerivApiInstance();
            setShowIntroPanel(true);
            setScanStatus('');
            setCurrentSignal(null);
            setShowSettingsPrompt(false);
        }
    }, [isOpen]);

    const startDeepScan = async () => {
        if (!apiRef.current) return;

        setIsScanning(true);
        setShowIntroPanel(false);
        setScanStatus(localize('Initializing deep scan...'));
        setCurrentSignal(null);

        try {
            // Fetch all volatility symbols
            const { active_symbols, error: asErr } = await apiRef.current.send({ active_symbols: 'brief' });
            if (asErr) throw asErr;

            const symbols = (active_symbols || [])
                .filter((s: any) => /synthetic/i.test(s.market))
                .filter((s: any) => /^Volatility\s+\d+(?:\s|\(|$)/i.test(s.display_name))
                .map((s: any) => ({ symbol: s.symbol, display_name: s.display_name }));

            if (symbols.length === 0) {
                setScanStatus(localize('No volatility symbols available to scan.'));
                setIsScanning(false);
                return;
            }

            setScanStatus(localize('Scanning {{count}} volatilities...', { count: symbols.length }));

            // Scan each symbol for strong signals
            for (const symbolInfo of symbols) {
                setScanStatus(localize('Deep scanning {{symbol}}...', { symbol: symbolInfo.display_name }));

                try {
                    const response = await apiRef.current.send({
                        ticks_history: symbolInfo.symbol,
                        count: 10,
                        end: 'latest',
                        subscribe: 0,
                    });

                    if (response?.error || !response?.history) continue;

                    const ticks = historyToTicks(response.history || {});
                    if (ticks.length < 10) continue;

                    const digits = ticks
                        .map((t: any) => {
                            const quote = Number((t as any).quote);
                            const digit = Number(String(quote).slice(-1));
                            return Number.isNaN(digit) ? null : digit;
                        })
                        .filter((d): d is number => d !== null);

                    if (digits.length < 10) continue;

                    // Analyze for strong patterns (matching AI Trading scanner logic)
                    const digitsGreaterThan4 = digits.filter(d => d > 4).length;
                    const digitsLessThan7 = digits.filter(d => d < 7).length;
                    const digitsGreaterThan5 = digits.filter(d => d > 5).length; // For Over 1

                    // Check for strong OVER signals
                    if (digitsGreaterThan4 >= 7) {
                        const signal: ScanResult = {
                            symbol: symbolInfo.symbol,
                            display_name: symbolInfo.display_name,
                            recommendation: localize('STRONG OVER SIGNAL — Over 2 ({{count}}/10 digits > 4)', {
                                count: digitsGreaterThan4,
                            }),
                            beforeLoss: 2,
                            afterLoss: 5,
                            signalType: 'over',
                            score: Math.min(100, 60 + digitsGreaterThan4 * 5),
                        };
                        setCurrentSignal(signal);
                        setIsScanning(false);
                        setScanStatus(localize('Strong signal found!'));
                        return;
                    }

                    // Check for strong UNDER signals
                    if (digitsLessThan7 >= 7) {
                        const signal: ScanResult = {
                            symbol: symbolInfo.symbol,
                            display_name: symbolInfo.display_name,
                            recommendation: localize('STRONG UNDER SIGNAL — Under 8 ({{count}}/10 digits < 7)', {
                                count: digitsLessThan7,
                            }),
                            beforeLoss: 8,
                            afterLoss: 4,
                            signalType: 'under',
                            score: Math.min(100, 60 + digitsLessThan7 * 5),
                        };
                        setCurrentSignal(signal);
                        setIsScanning(false);
                        setScanStatus(localize('Strong signal found!'));
                        return;
                    }
                } catch (error) {
                    continue; // Continue to next symbol if this one fails
                }
            }

            // If no strong signal found
            setScanStatus(localize('No strong signals found. Try again later.'));
            setIsScanning(false);
        } catch (error) {
            setScanStatus(localize('Scan failed. Please try again.'));
            setIsScanning(false);
        }
    };

    const handleLoadSignal = () => {
        setShowSettingsPrompt(true);
    };

    const handleSettingsSubmit = () => {
        if (currentSignal) {
            onLoadSignal(currentSignal, settings);
            onClose();
        }
    };

    const handleCancel = () => {
        setCurrentSignal(null);
        setShowSettingsPrompt(false);
        setScanStatus('');
    };

    if (!isOpen) return null;

    return (
        <div className='deep-scan-modal'>
            <div className='deep-scan-modal__overlay' onClick={onClose}></div>
            <div className='deep-scan-modal__content'>
                <div className='deep-scan-modal__header'>
                    <h2>🤖 {localize('AI Deep Scan')}</h2>
                    <button className='deep-scan-modal__close' onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className='deep-scan-modal__body'>
                    {showIntroPanel && !isScanning && (
                        <div className='deep-scan-modal__intro'>
                            <div className='deep-scan-modal__intro-icon'>🔍</div>
                            <h3>{localize('AI Deep Scan')}</h3>
                            <div className='deep-scan-modal__intro-description'>
                                <p>
                                    {localize(
                                        'Scan all market volatilities to find a strong trading signal and load it to AI Trading.'
                                    )}
                                </p>
                                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                                    {localize(
                                        'Click "Start Deep Scan" to analyze all markets and get a signal to trade.'
                                    )}
                                </p>
                            </div>
                            <div className='deep-scan-modal__intro-actions'>
                                <button className='deep-scan-modal__start-btn' onClick={startDeepScan}>
                                    {localize('Start Deep Scan')}
                                </button>
                                <button className='deep-scan-modal__cancel-btn' onClick={onClose}>
                                    {localize('Cancel')}
                                </button>
                            </div>
                        </div>
                    )}

                    {isScanning && (
                        <div className='deep-scan-modal__scanning'>
                            <div className='deep-scan-modal__spinner'></div>
                            <p>{scanStatus}</p>
                        </div>
                    )}

                    {currentSignal && !showSettingsPrompt && (
                        <div className='deep-scan-modal__signal'>
                            <div className='deep-scan-modal__signal-header'>
                                <h3>🎯 {localize('Signal Found')}</h3>
                                <div className='deep-scan-modal__signal-score'>
                                    {localize('Confidence')}: {currentSignal.score}%
                                </div>
                            </div>

                            <div className='deep-scan-modal__signal-details'>
                                <div className='deep-scan-modal__signal-symbol'>{currentSignal.display_name}</div>
                                <div className='deep-scan-modal__signal-type'>
                                    {currentSignal.signalType === 'over' ? '📈' : '📉'} {currentSignal.recommendation}
                                </div>
                                <div className='deep-scan-modal__signal-predictions'>
                                    <div>
                                        {localize('Before Loss')}: {currentSignal.beforeLoss}
                                    </div>
                                    <div>
                                        {localize('After Loss')}: {currentSignal.afterLoss}
                                    </div>
                                </div>
                            </div>

                            <div className='deep-scan-modal__actions'>
                                <button className='deep-scan-modal__load-btn' onClick={handleLoadSignal}>
                                    {localize('Load Signal')}
                                </button>
                                <button className='deep-scan-modal__cancel-btn' onClick={handleCancel}>
                                    {localize('Cancel')}
                                </button>
                            </div>
                        </div>
                    )}

                    {showSettingsPrompt && (
                        <div className='deep-scan-modal__settings'>
                            <h3>⚙️ {localize('Trading Settings')}</h3>
                            <p className='deep-scan-modal__settings-subtitle'>
                                {localize('Configure your trading parameters for the signal')}
                            </p>

                            <div className='deep-scan-modal__setting-group'>
                                <label>{localize('Stake ($)')}</label>
                                <p className='deep-scan-modal__setting-hint'>
                                    {localize('Initial amount for each trade')}
                                </p>
                                <input
                                    type='number'
                                    value={settings.stake}
                                    onChange={e => setSettings(prev => ({ ...prev, stake: Number(e.target.value) }))}
                                    min='0.1'
                                    step='0.1'
                                />
                            </div>

                            <div className='deep-scan-modal__setting-group'>
                                <label>{localize('Martingale Multiplier')}</label>
                                <p className='deep-scan-modal__setting-hint'>
                                    {localize('Multiply stake on loss (e.g., 2.0 = double on loss)')}
                                </p>
                                <input
                                    type='number'
                                    value={settings.martingaleMultiplier}
                                    onChange={e =>
                                        setSettings(prev => ({ ...prev, martingaleMultiplier: Number(e.target.value) }))
                                    }
                                    min='1.1'
                                    max='3.0'
                                    step='0.1'
                                />
                            </div>

                            <div className='deep-scan-modal__setting-group'>
                                <label>{localize('Total Stop Loss ($)')}</label>
                                <p className='deep-scan-modal__setting-hint'>
                                    {localize('Stop trading when total loss reaches this amount')}
                                </p>
                                <input
                                    type='number'
                                    value={settings.stopLoss}
                                    onChange={e => setSettings(prev => ({ ...prev, stopLoss: Number(e.target.value) }))}
                                    min='1'
                                    step='1'
                                />
                            </div>

                            <div className='deep-scan-modal__setting-group'>
                                <label>{localize('Total Take Profit ($)')}</label>
                                <p className='deep-scan-modal__setting-hint'>
                                    {localize('Stop trading when total profit reaches this amount')}
                                </p>
                                <input
                                    type='number'
                                    value={settings.takeProfit}
                                    onChange={e =>
                                        setSettings(prev => ({ ...prev, takeProfit: Number(e.target.value) }))
                                    }
                                    min='1'
                                    step='1'
                                />
                            </div>

                            <div className='deep-scan-modal__settings-actions'>
                                <button className='deep-scan-modal__start-btn' onClick={handleSettingsSubmit}>
                                    {localize('Load Signal to AI Trading')}
                                </button>
                                <button
                                    className='deep-scan-modal__cancel-btn'
                                    onClick={() => setShowSettingsPrompt(false)}
                                >
                                    {localize('Back')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeepScanModal;

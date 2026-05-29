import React from 'react';
import { observer } from 'mobx-react-lite';
import IframeWrapper from '@/components/iframe-wrapper';
import useThemeSwitcher from '@/hooks/useThemeSwitcher';

const Dtrader = observer(() => {
    const { is_dark_mode_on } = useThemeSwitcher();
    const theme = is_dark_mode_on ? 'dark' : 'light';
    
    // Pass the active theme to the iframe
    const src = `https://deriv-dtrader.vercel.app/dtrader?chart_type=area&interval=1t&symbol=1HZ100V&trade_type=over_under&theme=${theme}`;

    return (
        <div className="dtrader-frame-wrapper" style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
        }}>
            <IframeWrapper
                src={src}
                title='DTrader'
                className='dtrader-container'
            />
            {/* Watermark/Logo Covers that blend seamlessly with DTrader's workspace backgrounds */}
            <div className="dtrader-watermark-cover-left" style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '140px',
                height: '42px',
                backgroundColor: is_dark_mode_on ? '#101420' : '#ffffff',
                pointerEvents: 'none',
                zIndex: 999
            }} />
            <div className="dtrader-watermark-cover-right" style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '140px',
                height: '42px',
                backgroundColor: is_dark_mode_on ? '#101420' : '#ffffff',
                pointerEvents: 'none',
                zIndex: 999
            }} />
        </div>
    );
});

export default Dtrader;


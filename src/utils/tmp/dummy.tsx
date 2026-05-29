import { memo, SyntheticEvent } from 'react';
import { getUrlBase } from '@/public-path';

type TIconComponent = {
    icon: string;
    className?: string;
    onClick?: () => void;
    size?: number;
    height?: number | string;
    width?: number | string;
    id?: string;
    style?: { height?: number | string; width?: number | string };
};

const IconComponent: React.FC<TIconComponent> = ({ icon, ...rest }) => {
    const assetBase = getUrlBase('assets/icons/');
    const onError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
        // eslint-disable-next-line no-console
        (e.target as HTMLImageElement).src = `${assetBase}IcDashboard.svg`;
    };

    return (
        <div className='dummy-icon' {...rest}>
            <img src={`${assetBase}${icon}.svg`} alt={icon} onError={onError} />
        </div>
    );
};

export const Icon = memo(IconComponent);

export const IconTradeTypes = ({ children }) => {
    // Simulate scrollbars
    return <div className='dummy-IconTradeTypes'>{children}</div>;
};

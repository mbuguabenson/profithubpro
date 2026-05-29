import React, { useEffect, useState } from 'react';
import Button from '@/components/shared_ui/button';
import Modal from '@/components/shared_ui/modal';
import Text from '@/components/shared_ui/text';
import { localize } from '@deriv-com/translations';
import './risk-disclaimer.scss';

const RISK_DISCLAIMER_STORAGE_KEY = 'riskDisclaimerDismissed';

const RiskDisclaimer = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(RISK_DISCLAIMER_STORAGE_KEY) === 'true';
        setIsHidden(dismissed);
    }, []);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleDontShowAgain = () => {
        localStorage.setItem(RISK_DISCLAIMER_STORAGE_KEY, 'true');
        setIsHidden(true);
        setIsModalOpen(false);
    };

    const handleCloseWithoutHiding = () => {
        setIsModalOpen(false);
    };

    if (isHidden) {
        return null;
    }

    return (
        <>
            <div className='risk-disclaimer-button'>
                <Button className='risk-disclaimer-button__btn' onClick={handleOpenModal} secondary small>
                    {localize('Risk Disclaimer')}
                </Button>
            </div>

            <Modal
                is_open={isModalOpen}
                title={localize('')}
                onClose={handleCloseModal}
                width='520px'
                className='risk-disclaimer-modal'
            >
                <div className='risk-disclaimer-modal__content'>
                    <Text size='s' color='prominent' weight='bold' className='risk-disclaimer-modal__title'>
                        {localize('Risk Disclaimer')}
                    </Text>

                    <Text size='xs' color='general' className='risk-disclaimer-modal__text'>
                        {localize(
                            'Deriv offers complex derivatives, such as options and contracts for difference (“CFDs”). These products may not be suitable for all clients, and trading them puts you at risk.'
                        )}
                    </Text>

                    <Text size='xs' color='general' className='risk-disclaimer-modal__text'>
                        {localize(
                            'Please make sure that you understand the following risks before trading Deriv products:'
                        )}
                    </Text>

                    <ul className='risk-disclaimer-modal__list'>
                        <li>{localize('You may lose some or all of the money you invest in the trade.')}</li>
                        <li>
                            {localize(
                                'If your trade involves currency conversion, exchange rates will affect your profit and loss.'
                            )}
                        </li>
                    </ul>

                    <Text size='xs' color='general' className='risk-disclaimer-modal__note'>
                        {localize(
                            'You should never trade with borrowed money or with money that you cannot afford to lose.'
                        )}
                    </Text>

                    <div className='risk-disclaimer-modal__actions'>
                        <Button className='risk-disclaimer-modal__dont-show-btn' onClick={handleDontShowAgain}>
                            {localize("Don't Show Again")}
                        </Button>
                        <Button className='risk-disclaimer-modal__close-btn' onClick={handleCloseWithoutHiding}>
                            {localize('Close')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default RiskDisclaimer;

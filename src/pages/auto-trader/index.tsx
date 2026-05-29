import { observer } from 'mobx-react-lite';
import SmartTrader from '../smart-trader';
import './auto-trader.scss';

const ProAutoTrader = observer(() => {
    return (
        <div className='auto-trader-wrapper'>
            <SmartTrader />
        </div>
    );
});

export default ProAutoTrader;

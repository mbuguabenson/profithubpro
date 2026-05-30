import React, { useState, useRef, useEffect } from 'react';
import './floating-ai-button.scss';

interface FloatingAIButtonProps {
    onOpenDeepScan: () => void;
}

const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ onOpenDeepScan }) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;

            // Keep button within viewport bounds
            const maxX = window.innerWidth - 60;
            const maxY = window.innerHeight - 60;
            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));

            setPosition({ x: clampedX, y: clampedY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            return;
        }
        onOpenDeepScan();
    };

    return (
        <div
            ref={buttonRef}
            className='floating-ai-button'
            style={{
                left: position.x,
                top: position.y,
            }}
            onMouseDown={handleMouseDown}
            onClick={handleClick}
        >
            <div className='floating-ai-button__icon'>🤖</div>
            <div className='floating-ai-button__glow'></div>
            <div className='floating-ai-button__sparkle'></div>
        </div>
    );
};

export default FloatingAIButton;

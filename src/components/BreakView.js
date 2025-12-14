import { useState, useEffect, useRef } from 'react';

const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// Định nghĩa các bài tập
const BREAK_EXERCISES = [
    {
        id: 'breathing-4-7-8',
        name: 'Kỹ thuật thở 4-7-8',
        icon: '🌬️',
        totalReps: 4,
        steps: [
            { text: 'Thở ra bằng miệng hết hơi', duration: 3, action: 'Chuẩn bị' },
            { text: 'Hít vào bằng mũi', duration: 4, action: 'Hít vào' },
            { text: 'Giữ hơi', duration: 7, action: 'Giữ' },
            { text: 'Thở ra bằng miệng', duration: 8, action: 'Thở ra' }
        ]
    },
    {
        id: 'neck-shoulder',
        name: 'Thư giãn cổ và vai',
        icon: '🧘',
        totalReps: 3,
        steps: [
            { text: 'Nghiêng đầu sang trái, giữ 5 giây', duration: 5, action: 'Trái' },
            { text: 'Nghiêng đầu sang phải, giữ 5 giây', duration: 5, action: 'Phải' },
            { text: 'Cúi đầu xuống trước, giữ 5 giây', duration: 5, action: 'Xuống' },
            { text: 'Ngửa đầu ra sau, giữ 5 giây', duration: 5, action: 'Lên' },
            { text: 'Xoay vai về trước 5 lần', duration: 5, action: 'Xoay trước' },
            { text: 'Xoay vai về sau 5 lần', duration: 5, action: 'Xoay sau' }
        ]
    },
    {
        id: 'eye-exercise',
        name: 'Thư giãn mắt',
        icon: '👁️',
        totalReps: 3,
        steps: [
            { text: 'Nhìn lên trên, giữ 3 giây', duration: 3, action: 'Lên' },
            { text: 'Nhìn xuống dưới, giữ 3 giây', duration: 3, action: 'Xuống' },
            { text: 'Nhìn sang trái, giữ 3 giây', duration: 3, action: 'Trái' },
            { text: 'Nhìn sang phải, giữ 3 giây', duration: 3, action: 'Phải' },
            { text: 'Chớp mắt nhanh 10 lần', duration: 5, action: 'Chớp mắt' },
            { text: 'Nhắm mắt nghỉ', duration: 5, action: 'Nghỉ' }
        ]
    },
    {
        id: 'wrist-stretch',
        name: 'Giãn cổ tay',
        icon: '✋',
        totalReps: 2,
        steps: [
            { text: 'Duỗi thẳng cánh tay, gập ngón tay về phía mình', duration: 8, action: 'Kéo về' },
            { text: 'Duỗi thẳng cánh tay, đẩy ngón tay ra xa', duration: 8, action: 'Đẩy ra' },
            { text: 'Xoay cổ tay theo chiều kim đồng hồ', duration: 5, action: 'Xoay phải' },
            { text: 'Xoay cổ tay ngược chiều kim đồng hồ', duration: 5, action: 'Xoay trái' }
        ]
    }
];

const BreakView = ({ duration, onBreakEnd, onSkipBreak }) => {
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isPaused, setIsPaused] = useState(false);
    const [currentExercise, setCurrentExercise] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [currentRep, setCurrentRep] = useState(1);
    const [stepTimeLeft, setStepTimeLeft] = useState(BREAK_EXERCISES[0].steps[0].duration);
    
    const timerRef = useRef(null);
    const stepTimerRef = useRef(null);
    
    // Đếm ngược tổng thời gian nghỉ
    useEffect(() => {
        timerRef.current = setInterval(() => {
            if (!isPaused) {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        onBreakEnd();
                        return 0;
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [isPaused, onBreakEnd]);

    // FIXED: Đếm ngược từng bước trong bài tập
    useEffect(() => {
        const exercise = BREAK_EXERCISES[currentExercise];
        
        stepTimerRef.current = setInterval(() => {
            if (!isPaused) {
                setStepTimeLeft(prev => {
                    if (prev <= 1) {
                        // Chuyển sang bước tiếp theo
                        if (currentStep < exercise.steps.length - 1) {
                            const nextStep = currentStep + 1;
                            setCurrentStep(nextStep);
                            return exercise.steps[nextStep].duration;
                        } else {
                            // Hết các bước, kiểm tra số lần lặp
                            if (currentRep < exercise.totalReps) {
                                setCurrentRep(prev => prev + 1);
                                setCurrentStep(0);
                                return exercise.steps[0].duration;
                            } else {
                                // Chuyển sang bài tập tiếp theo
                                const nextExercise = (currentExercise + 1) % BREAK_EXERCISES.length;
                                setCurrentExercise(nextExercise);
                                setCurrentStep(0);
                                setCurrentRep(1);
                                return BREAK_EXERCISES[nextExercise].steps[0].duration;
                            }
                        }
                    }
                    return prev - 1;
                });
            }
        }, 1000);

        return () => clearInterval(stepTimerRef.current);
    }, [isPaused, currentExercise, currentStep, currentRep]);
    
    const progress = ((duration - timeLeft) / duration) * 100;
    const exercise = BREAK_EXERCISES[currentExercise];
    const step = exercise.steps[currentStep]; // FIXED: đảm bảo step luôn tồn tại

    const handleNextExercise = () => {
        const nextExercise = (currentExercise + 1) % BREAK_EXERCISES.length;
        setCurrentExercise(nextExercise);
        setCurrentStep(0);
        setCurrentRep(1);
        setStepTimeLeft(BREAK_EXERCISES[nextExercise].steps[0].duration);
    };

    const handlePrevExercise = () => {
        const prevExercise = currentExercise === 0 ? BREAK_EXERCISES.length - 1 : currentExercise - 1;
        setCurrentExercise(prevExercise);
        setCurrentStep(0);
        setCurrentRep(1);
        setStepTimeLeft(BREAK_EXERCISES[prevExercise].steps[0].duration);
    };

    // ADDED: Kiểm tra an toàn trước khi render
    if (!step) {
        return null;
    }

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gradient-to-br from-green-900 to-green-800 text-white p-6">
            {/* Progress bar */}
            <div className="w-full h-1 bg-green-700 fixed top-0 left-0 z-50">
                <div className="h-1 bg-green-400 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
            
            {/* Tổng thời gian còn lại */}
            <div className="fixed top-4 right-4 bg-green-800/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="text-sm text-green-300">Thời gian còn lại</div>
                <div className="text-2xl font-bold">{formatTimer(timeLeft)}</div>
            </div>

            {/* Tên bài tập */}
            <div className="text-6xl mb-4">{exercise.icon}</div>
            <h2 className="text-3xl font-bold mb-2">{exercise.name}</h2>
            <div className="text-green-300 mb-8">
                Lần {currentRep}/{exercise.totalReps}
            </div>

            {/* Bước hiện tại */}
            <div className="bg-green-800/50 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full mb-8 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="text-7xl font-bold mb-4 text-green-300">
                        {stepTimeLeft}
                    </div>
                    <div className="text-xl text-green-200 font-semibold mb-2">
                        {step.action}
                    </div>
                    <div className="text-lg text-green-100">
                        {step.text}
                    </div>
                </div>

                {/* Progress steps */}
                <div className="flex justify-center gap-2 mt-6">
                    {exercise.steps.map((_, index) => (
                        <div 
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                index === currentStep 
                                    ? 'w-8 bg-green-400' 
                                    : index < currentStep 
                                        ? 'w-2 bg-green-500' 
                                        : 'w-2 bg-green-700'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Điều khiển */}
            <div className="fixed bottom-6 flex flex-wrap justify-center gap-4 max-w-4xl">
                <button 
                    onClick={handlePrevExercise} 
                    className="text-white font-semibold py-3 px-6 rounded-lg bg-green-700/80 hover:bg-green-600 transition-colors backdrop-blur-sm"
                >
                    ⏮️ Bài trước
                </button>
                
                <button 
                    onClick={() => setIsPaused(!isPaused)} 
                    className="text-white font-semibold py-3 px-6 rounded-lg bg-green-700/80 hover:bg-green-600 transition-colors backdrop-blur-sm"
                >
                    {isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng'}
                </button>

                <button 
                    onClick={handleNextExercise} 
                    className="text-white font-semibold py-3 px-6 rounded-lg bg-green-700/80 hover:bg-green-600 transition-colors backdrop-blur-sm"
                >
                    ⏭️ Bài sau
                </button>
                
                <button 
                    onClick={onBreakEnd} 
                    className="text-white font-semibold py-3 px-6 rounded-lg bg-green-700/80 hover:bg-green-600 transition-colors backdrop-blur-sm"
                >
                    ⏩ Kết thúc nghỉ
                </button>
                
                <button 
                    onClick={onSkipBreak} 
                    className="text-white font-semibold py-3 px-6 rounded-lg bg-green-700/80 hover:bg-green-600 transition-colors backdrop-blur-sm"
                >
                    🏠 Về trang chính
                </button>
            </div>
        </div>
    );
};

export default BreakView;
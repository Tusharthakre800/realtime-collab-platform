import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';

const DrawingCanvas = ({ roomId, socket }) => {
  const canvasRef = useRef(null);
  const toolbarRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#e94560');
  const [brushSize, setBrushSize] = useState(2);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(toolbarRef.current,
      { opacity: 0, y: -20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
    ).fromTo(canvasRef.current,
      { opacity: 0, scale: 0.98 },
      { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
    );

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const resizeCanvas = () => {
      // Save current canvas state before resizing
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempContext.drawImage(canvas, 0, 0);

      // Resize canvas
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Restore canvas state
      context.drawImage(tempCanvas, 0, 0);
      
      // Set white background
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    
    // Load saved canvas state
    const savedCanvas = localStorage.getItem(`canvas-${roomId}`);
    if (savedCanvas) {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      };
      img.onerror = () => {
        // If image fails to load, set white background
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
      };
      img.src = savedCanvas;
    } else {
      // Set white background for new canvas
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);

    return () => {
      // Save canvas state before unmount
      const canvasData = canvas.toDataURL();
      localStorage.setItem(`canvas-${roomId}`, canvasData);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [roomId]);

  useEffect(() => {
    if (socket) {
      socket.on('drawing-data', (data) => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        context.save();
        context.globalCompositeOperation = data.isEraser ? 'destination-out' : 'source-over';
        context.strokeStyle = data.color;
        context.lineWidth = data.brushSize;
        context.lineCap = 'round';

        if (data.type === 'start') {
          context.beginPath();
          context.moveTo(data.x, data.y);
        } else if (data.type === 'draw') {
          context.beginPath();
          context.moveTo(data.lastX || data.x, data.lastY || data.y);
          context.lineTo(data.x, data.y);
          context.stroke();
        } else if (data.type === 'clear') {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        context.restore();
      });

      // Request canvas state when joining
      socket.emit('request-canvas-state', { roomId });

      socket.on('canvas-state', (data) => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (data.imageData) {
          const img = new Image();
          img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0);
          };
          img.src = data.imageData;
        }
      });

      return () => {
        socket.off('drawing-data');
        socket.off('canvas-state');
        socket.off('request-canvas-state');
      };
    }
  }, [socket, roomId]);

  // Auto-save canvas state
  useEffect(() => {
    if (socket && isDrawing === false) {
      const canvas = canvasRef.current;
      const canvasData = canvas.toDataURL();
      socket.emit('save-canvas-state', { roomId, imageData: canvasData });
    }
  }, [isDrawing, socket, roomId]);

  const animateBrushSize = (newSize) => {
    gsap.to('.brush-size-indicator', {
      scale: 1.2,
      duration: 0.2,
      yoyo: true,
      repeat: 1
    });
    setBrushSize(newSize);
  };

  const animateColorChange = (newColor) => {
    gsap.to('.color-indicator', {
      scale: 1.1,
      rotation: 360,
      duration: 0.3,
      ease: "power2.inOut"
    });
    setColor(newColor);
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { offsetX, offsetY } = e.nativeEvent;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    context.beginPath();
    context.moveTo(offsetX, offsetY);
    
    if (socket) {
      socket.emit('drawing-data', {
        roomId,
        data: { type: 'start', x: offsetX, y: offsetY, color, brushSize, isEraser }
      });
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const { offsetX, offsetY } = e.nativeEvent;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    context.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineTo(offsetX, offsetY);
    context.stroke();
    context.beginPath();
    context.moveTo(offsetX, offsetY);

    if (socket) {
      socket.emit('drawing-data', {
        roomId,
        data: { 
          type: 'draw', 
          x: offsetX, 
          y: offsetY, 
          lastX: offsetX - e.movementX,
          lastY: offsetY - e.movementY,
          color, 
          brushSize, 
          isEraser 
        }
      });
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.beginPath();
    
    // Save canvas state after drawing
    const canvasData = canvas.toDataURL();
    localStorage.setItem(`canvas-${roomId}`, canvasData);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    gsap.to(canvas, {
      opacity: 0.5,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Clear from localStorage and server
    localStorage.removeItem(`canvas-${roomId}`);
    if (socket) {
      socket.emit('drawing-data', {
        roomId,
        data: { type: 'clear' }
      });
    }
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    
    gsap.to('.save-btn', {
      scale: 0.9,
      duration: 0.1,
      yoyo: true,
      repeat: 1
    });
    
    link.download = `collaboration-${roomId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Touch event handlers
  const getTouchPos = (canvas, touchEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: touchEvent.clientX - rect.left,
      y: touchEvent.clientY - rect.top
    };
  };

  const startTouchDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const touch = e.touches[0];
    const pos = getTouchPos(canvas, touch);
    const context = canvas.getContext('2d');
    
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    
    if (socket) {
      socket.emit('drawing-data', {
        roomId,
        data: { type: 'start', x: pos.x, y: pos.y, color, brushSize, isEraser }
      });
    }
  };

  const touchDraw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const touch = e.touches[0];
    const pos = getTouchPos(canvas, touch);
    
    context.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineTo(pos.x, pos.y);
    context.stroke();
    context.beginPath();
    context.moveTo(pos.x, pos.y);

    if (socket) {
      socket.emit('drawing-data', {
        roomId,
        data: { type: 'draw', x: pos.x, y: pos.y, color, brushSize, isEraser }
      });
    }
  };

  const stopTouchDrawing = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.beginPath();
    
    const canvasData = canvas.toDataURL();
    localStorage.setItem(`canvas-${roomId}`, canvasData);
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1a2e]">
      <div 
        ref={toolbarRef}
        className="bg-[#16213e] border-b border-[#0f3460] px-4 py-3 md:px-6 md:py-3 flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-6"
      >
        <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-6">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-white">Color:</label>
            <input
              type="color"
              value={color}
              onChange={(e) => animateColorChange(e.target.value)}
              className="color-indicator w-8 h-8 md:w-10 md:h-10 rounded-full cursor-pointer border-2 border-[#0f3460] hover:border-[#e94560] transition-all"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-white">Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => animateBrushSize(Number(e.target.value))}
              className="w-20 md:w-24 accent-[#e94560]"
            />
            <span className="brush-size-indicator text-sm font-bold text-[#e94560] w-6 text-center">{brushSize}</span>
          </div>
        </div>

        <div className="flex gap-2 md:gap-3">
          <button
            onClick={() => {
              setIsEraser(!isEraser);
              gsap.to('.eraser-btn', {
                scale: 1.1,
                duration: 0.2,
                yoyo: true,
                repeat: 1
              });
            }}
            className={`eraser-btn px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-all border border-[#0f3460] ${
              isEraser 
                ? 'bg-[#e94560] text-white shadow-lg' 
                : 'bg-[#0f3460] text-white hover:bg-[#e94560]'
            }`}
          >
            {isEraser ? 'Eraser' : 'Brush'}
          </button>

          <button
            onClick={clearCanvas}
            className="px-3 py-2 md:px-4 md:py-2 bg-[#0f3460] text-white rounded-lg hover:bg-[#e94560] transition-all border border-[#0f3460]"
          >
            Clear
          </button>

          <button
            onClick={saveDrawing}
            className="save-btn px-3 py-2 md:px-4 md:py-2 bg-[#0f3460] text-white rounded-lg hover:bg-[#e94560] transition-all border border-[#0f3460]"
          >
            Save
          </button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="flex-1 bg-white cursor-crosshair border-t border-[#0f3460] touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startTouchDrawing}
        onTouchMove={touchDraw}
        onTouchEnd={stopTouchDrawing}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};

export default DrawingCanvas;
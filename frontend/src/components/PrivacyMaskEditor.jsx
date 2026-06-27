import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Plus, HelpCircle } from 'lucide-react';

const PrivacyMaskEditor = ({ imageUrl, initialMasks = [], onSave }) => {
  const canvasRef = useRef(null);
  const [masks, setMasks] = useState(initialMasks);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const imageRef = useRef(new Image());

  // Load snapshot image on mount
  useEffect(() => {
    const img = imageRef.current;
    img.src = imageUrl || 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=640&q=80'; // high quality camera placeholder
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgLoaded(true);
      drawCanvas();
    };
  }, [imageUrl]);

  // Redraw canvas whenever drawing state, current pos, or masks list changes
  useEffect(() => {
    if (imgLoaded) {
      drawCanvas();
    }
  }, [masks, isDrawing, currentPos, imgLoaded]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw snapshot background
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw saved mask zones
    masks.forEach((mask, index) => {
      const points = mask.points || [];
      if (points.length < 4) return;
      
      ctx.beginPath();
      // Move to first absolute coordinate
      ctx.moveTo(points[0].x * canvas.width, points[0].y * canvas.height);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * canvas.width, points[i].y * canvas.height);
      }
      ctx.closePath();
      
      // Semitransparent fill (Amber/Red)
      ctx.fillStyle = 'rgba(255, 23, 68, 0.45)';
      ctx.fill();
      
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw tag label index
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Space Grotesk';
      ctx.fillText(`MASK #${index + 1}`, points[0].x * canvas.width + 6, points[0].y * canvas.height + 18);
    });

    // Draw active drawing box
    if (isDrawing) {
      ctx.beginPath();
      ctx.rect(startPos.x, startPos.y, currentPos.x - startPos.x, currentPos.y - startPos.y);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Calculate exact pixel position relative to canvas container
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = getMousePos(e);
    setCurrentPos(pos);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    
    // Normalized relative coordinates
    const x1 = Math.min(startPos.x, currentPos.x) / canvas.width;
    const y1 = Math.min(startPos.y, currentPos.y) / canvas.height;
    const x2 = Math.max(startPos.x, currentPos.x) / canvas.width;
    const y2 = Math.max(startPos.y, currentPos.y) / canvas.height;

    // Check if drawn zone has valid sizing (e.g. > 1% size)
    if (Math.abs(x2 - x1) > 0.01 && Math.abs(y2 - y1) > 0.01) {
      // Define 4 corner points for the mask polygon
      const newMask = {
        points: [
          { x: x1, y: y1 },
          { x: x2, y: y1 },
          { x: x2, y: y2 },
          { x: x1, y: y2 }
        ]
      };
      setMasks([...masks, newMask]);
    }
  };

  const handleClear = () => {
    setMasks([]);
  };

  const handleRemoveMask = (index) => {
    setMasks(masks.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Privacy Masking Configuration</span>
            <HelpCircle size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} title="Click and drag over image snapshot to draw blur boxes." />
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Drawn sectors will be blurred automatically in OpenCV frames before police streaming.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleClear} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Trash2 size={14} /> Clear All
          </button>
          <button onClick={() => onSave(masks)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Save Zones
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Interactive drawing area */}
        <div style={{
          position: 'relative',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.08)',
          background: '#000',
          cursor: 'crosshair',
          flexShrink: 0
        }}>
          <canvas
            ref={canvasRef}
            width={580}
            height={340}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ display: 'block' }}
          />
        </div>

        {/* Mask list editor */}
        <div className="card-glass" style={{ flexGrow: 1, maxHeight: '340px', overflowY: 'auto' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Configured Blurs ({masks.length})</h4>
          {masks.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>
              No custom masks defined. Drag on canvas snap to mask a zone.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {masks.map((mask, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#ff1744', fontWeight: 'bold' }}>
                    Sector Blur Area #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveMask(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} className="hover-color-red" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivacyMaskEditor;

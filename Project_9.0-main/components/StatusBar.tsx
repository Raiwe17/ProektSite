import React from 'react';
import { AppMode, ElementType } from '../types';
import { TOOLS } from '../constants';
import { MousePointer2, Stamp, X, Command } from 'lucide-react';

interface StatusBarProps {
  mode: AppMode;
  stampType: ElementType | null;
  elementCount: number;
  onExitStampMode: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  mode, 
  stampType, 
  elementCount,
  onExitStampMode 
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-gray-900/90 backdrop-blur text-gray-400 text-xs flex items-center px-2 sm:px-4 justify-between border-t border-gray-800 z-40 select-none">
      <div className="flex items-center space-x-2 sm:space-x-6 overflow-x-auto flex-1 min-w-0">
        {/* Mode Indicator */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <span className="font-semibold text-gray-500 uppercase tracking-wider hidden sm:inline">Режим:</span>
          {mode === 'STAMP' ? (
            <div className="flex items-center text-orange-400 space-x-1 animate-pulse">
              <Stamp className="w-3 h-3" />
              <span className="font-bold text-[10px] sm:text-xs">ШТАМП{stampType && <span className="hidden sm:inline"> ({TOOLS[stampType].label})</span>}</span>
            </div>
          ) : (
            <div className="flex items-center text-blue-400 space-x-1">
              <MousePointer2 className="w-3 h-3" />
              <span className="font-bold text-[10px] sm:text-xs">ВЫБОР</span>
            </div>
          )}
        </div>

        {/* Hints */}
        <div className="flex items-center space-x-2 sm:space-x-3 border-l border-gray-700 pl-2 sm:pl-4 hidden md:flex">
          {mode === 'STAMP' ? (
            <>
              <span className="flex items-center text-[10px] sm:text-xs"><span className="bg-gray-700 text-gray-200 px-1 rounded mx-1">ЛКМ</span> Разместить</span>
              <span className="flex items-center text-[10px] sm:text-xs"><span className="bg-gray-700 text-gray-200 px-1 rounded mx-1">Esc</span> Отмена</span>
            </>
          ) : (
             <>
              <span className="flex items-center mr-1 sm:mr-2 text-[10px] sm:text-xs"><span className="bg-gray-700 text-gray-200 px-1 rounded mx-1">ПКМ</span> Меню</span>
              <div className="h-3 w-px bg-gray-700 mx-1 sm:mx-2"></div>
              <span className="flex items-center text-[10px] sm:text-xs" title="Delete"><span className="bg-gray-700 text-gray-200 px-1 rounded mx-1">Del</span> Удалить</span>
              <span className="flex items-center text-[10px] sm:text-xs hidden lg:flex" title="Ctrl+D"><span className="bg-gray-700 text-gray-200 px-1 rounded mx-1">Ctrl+D</span> Копия</span>
              <span className="flex items-center text-[10px] sm:text-xs hidden xl:flex" title="Arrow Keys"><span className="bg-gray-700 text-gray-200 px-1 rounded mx-1">←↑↓→</span> Двигать</span>
             </>
          )}
        </div>
      </div>

      {/* Stats / Controls */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        <span className="text-[10px] sm:text-xs hidden sm:inline">Элементов: {elementCount}</span>
        <span className="text-[10px] sm:text-xs sm:hidden">{elementCount}</span>
        {mode === 'STAMP' && (
           <button 
             onClick={onExitStampMode}
             className="flex items-center space-x-1 hover:text-white hover:bg-red-500/20 px-1 sm:px-2 py-0.5 rounded transition-colors text-[10px] sm:text-xs"
           >
             <X className="w-3 h-3" />
             <span className="hidden sm:inline">Выйти</span>
           </button>
        )}
      </div>
    </div>
  );
};
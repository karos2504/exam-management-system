import React from 'react';

const Loading = ({ text = 'Đang tải...' }) => (
  <div className="flex flex-col items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-400 border-t-transparent mb-2" />
    <div className="text-gray-600">{text}</div>
  </div>
);

export default Loading; 
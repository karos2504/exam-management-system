import React, { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Đã xảy ra lỗi</h1>
            <p className="mt-2 text-gray-600">Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
            <p className="mt-2 text-sm text-gray-500">{this.state.error?.message}</p>
            <button
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
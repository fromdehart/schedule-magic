import React, { useState } from 'react';
import { processActivityInput, ActivityProcessingResult } from '../lib/activity-processor';
import { ProcessedActivity } from '../types/activity';
import { Sparkles, Link, Loader2, HelpCircle } from 'lucide-react';

interface ActivityInputProps {
  onActivityProcessed: (activity: ProcessedActivity) => void;
  onError: (error: string) => void;
}

export const ActivityInput: React.FC<ActivityInputProps> = ({
  onActivityProcessed,
  onError
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasUrl, setHasUrl] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputText.trim()) {
      onError('Please enter some text or a link');
      return;
    }

    setIsProcessing(true);
    
    try {
      // Check if input looks like a URL
      const urlPattern = /^https?:\/\/.+/i;
      const isUrl = urlPattern.test(inputText.trim());
      
      const result: ActivityProcessingResult = await processActivityInput(
        inputText.trim(),
        isUrl ? inputText.trim() : undefined
      );

      if (result.success && result.activity) {
        onActivityProcessed(result.activity);
        setInputText('');
        setHasUrl(false);
      } else {
        onError(result.error || 'Failed to process activity');
      }
    } catch (error) {
      console.error('Error processing activity:', error);
      onError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    // Check if input looks like a URL
    const urlPattern = /^https?:\/\/.+/i;
    setHasUrl(urlPattern.test(value.trim()));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    const urlPattern = /^https?:\/\/.+/i;
    setHasUrl(urlPattern.test(pastedText.trim()));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Add New Activity
          </h2>
          <button
            type="button"
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <HelpCircle className="w-4 h-4" />
            Tips
          </button>
        </div>
        <p className="text-gray-600 text-sm mt-1">
          Paste a description, link, or any text about an activity you'd like to remember and share.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={handleInputChange}
            onPaste={handlePaste}
            placeholder="Paste a link or describe an activity"
            className="w-full h-28 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            disabled={isProcessing}
          />
          
          {/* URL indicator */}
          {hasUrl && (
            <div className="absolute top-3 right-3 flex items-center gap-1 text-blue-600">
              <Link className="w-4 h-4" />
              <span className="text-xs font-medium">URL detected</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <button
            type="submit"
            disabled={isProcessing || !inputText.trim()}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors md:order-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Process Activity
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 md:order-1">
            <Sparkles className="w-4 h-4" />
            <span>AI will extract the data automatically</span>
          </div>
        </div>
      </form>

      {/* Tips - Collapsible */}
      {showTips && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for better results:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Include location, date, or time when possible</li>
            <li>• Paste links to event pages, restaurant websites, or venue pages</li>
            <li>• Mention who the activity is for (family, kids, adults, etc.)</li>
            <li>• Include any special requirements or notes</li>
          </ul>
        </div>
      )}
    </div>
  );
};

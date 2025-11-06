"use client";

import { useEffect, useState } from 'react';
import { fetchBookProgress, TopicStatus } from '@/services/progressService';

// Define props for the component
interface TopicCompletionListProps {
  bookId: string;
}

// Helper component for a single topic row
const TopicItem = ({ topic }: { topic: TopicStatus }) => {
  let icon = '⬜️'; // Default: Not Attempted
  let color = 'text-gray-500';
  let scoreText = '';

  if (topic.status === 'completed') {
    icon = '✅';
    color = 'text-green-600';
    scoreText = `(${(topic.score! * 100).toFixed(0)}%)`;
  } else if (topic.status === 'failed') {
    icon = '⚠️';
    color = 'text-yellow-600';
    scoreText = `(${(topic.score! * 100).toFixed(0)}%)`;
  }

  return (
    <li className={`flex items-center space-x-2 ${color}`}>
      <span className="text-lg">{icon}</span>
      <span className="flex-1">{topic.topic_title}</span>
      <span className="font-medium">{scoreText}</span>
    </li>
  );
};

// Main component
const TopicCompletionList = ({ bookId }: TopicCompletionListProps) => {
  const [topics, setTopics] = useState<TopicStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;

    const loadProgress = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchBookProgress(bookId);
        setTopics(data.completion_status);
      } catch (err: any) {
        setError(err.message || 'Failed to load topic progress.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [bookId]); // Re-fetch if bookId changes

  if (isLoading) {
    return <div className="text-center p-4">Loading Progress...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  if (topics.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        No topics found for this book.
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Topic Completion</h3>
      <ul className="space-y-2">
        {topics.map((topic) => (
          <TopicItem key={topic.topic_title} topic={topic} />
        ))}
      </ul>
    </div>
  );
};

export default TopicCompletionList;
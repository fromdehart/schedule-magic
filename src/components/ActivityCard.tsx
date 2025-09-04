import React, { useState } from 'react';
import { Activity, ActivityCardProps } from '../types/activity';
import { Edit3, Trash2, Share2, MapPin, Calendar, Clock, DollarSign, Users, Cloud, CloudOff } from 'lucide-react';

const categoryColors: { [key: string]: string } = {
  food: 'bg-orange-100 text-orange-800 border-orange-200',
  entertainment: 'bg-purple-100 text-purple-800 border-purple-200',
  outdoor: 'bg-green-100 text-green-800 border-green-200',
  culture: 'bg-blue-100 text-blue-800 border-blue-200',
  shopping: 'bg-pink-100 text-pink-800 border-pink-200',
  family: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  social: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  sports: 'bg-red-100 text-red-800 border-red-200',
  education: 'bg-teal-100 text-teal-800 border-teal-200',
  wellness: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  travel: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  general: 'bg-gray-100 text-gray-800 border-gray-200'
};

const statusColors: { [key: string]: string } = {
  idea: 'bg-gray-100 text-gray-800',
  planned: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityColors: { [key: string]: string } = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700'
};

const priorityLabels: { [key: string]: string } = {
  low: 'Maybe',
  medium: 'Interesting',
  high: 'Must Do'
};

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  onEdit,
  onDelete,
  onShare,
  onStatusChange
}) => {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return null;
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header with status and actions */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[activity.status]}`}>
                {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[activity.priority]}`}>
                {priorityLabels[activity.priority] || activity.priority}
              </span>
              {activity.weather_dependent && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                  <Cloud className="w-3 h-3" />
                  Weather
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
              {activity.title}
            </h3>
          </div>
          
          {/* Action buttons */}
          <div className={`flex items-center gap-1 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            {onEdit && (
              <button
                onClick={() => onEdit(activity)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit activity"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            {onShare && (
              <button
                onClick={() => onShare(activity)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Share activity"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(activity)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete activity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <p className="text-gray-600 text-sm line-clamp-3">
          {activity.description}
        </p>
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-2">
        {activity.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}
        
        {(activity.date || activity.time) && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {activity.date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(activity.date)}</span>
              </div>
            )}
            {activity.time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatTime(activity.time)}</span>
              </div>
            )}
          </div>
        )}

        {(activity.estimated_duration || activity.cost_estimate) && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {activity.estimated_duration && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatDuration(activity.estimated_duration)}</span>
              </div>
            )}
            {activity.cost_estimate && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span>{activity.cost_estimate}</span>
              </div>
            )}
          </div>
        )}

        {activity.age_appropriate && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{activity.age_appropriate}</span>
          </div>
        )}
      </div>

      {/* Categories */}
      {activity.categories && activity.categories.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {activity.categories.slice(0, 3).map((category) => (
              <span
                key={category}
                className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColors[category] || categoryColors.general}`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
            ))}
            {activity.categories.length > 3 && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                +{activity.categories.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* URL link */}
      {activity.url && (
        <div className="px-4 pb-3">
          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            <span>View details</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {/* Status change buttons */}
      {onStatusChange && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            {activity.status !== 'idea' && (
              <button
                onClick={() => onStatusChange(activity, 'idea')}
                className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Mark as Idea
              </button>
            )}
            {activity.status !== 'planned' && (
              <button
                onClick={() => onStatusChange(activity, 'planned')}
                className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Plan It
              </button>
            )}
            {activity.status !== 'completed' && (
              <button
                onClick={() => onStatusChange(activity, 'completed')}
                className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
              >
                Mark Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

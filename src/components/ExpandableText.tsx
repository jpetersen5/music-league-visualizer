// src/components/ExpandableText.tsx
import React, { useState } from 'react';
import './ExpandableText.scss';

interface ExpandableTextProps {
  text: string;
  maxLength: number;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, maxLength }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (text.length <= maxLength) {
    return <span>{text}</span>;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <span>
      {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      <button onClick={toggleExpanded} className="expandable-text-button">
        {isExpanded ? 'Read less' : 'Read more'}
      </button>
    </span>
  );
};

export default ExpandableText;

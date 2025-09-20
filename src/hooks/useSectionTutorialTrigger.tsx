import { useEffect, useState } from 'react';
import { useSectionTutorials } from './useSectionTutorials';

export const useSectionTutorialTrigger = (section: string) => {
  const { shouldShowTutorial, markTutorialAsViewed, loading } = useSectionTutorials();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!loading && shouldShowTutorial(section)) {
      setShowTutorial(true);
    }
  }, [section, shouldShowTutorial, loading]);

  const closeTutorial = async () => {
    setShowTutorial(false);
    await markTutorialAsViewed(section);
  };

  return {
    showTutorial,
    closeTutorial
  };
};
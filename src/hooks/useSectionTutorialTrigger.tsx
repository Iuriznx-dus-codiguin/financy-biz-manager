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

  const closeTutorial = async (completed: boolean = true) => {
    setShowTutorial(false);
    await markTutorialAsViewed(section, completed);
  };

  return {
    showTutorial,
    closeTutorial
  };
};
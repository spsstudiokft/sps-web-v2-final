import { useEffect } from 'react';

export function usePageTitle(title: string, siteName: string = 'SPS Studio') {
  useEffect(() => {
    document.title = title ? `${title} | ${siteName}` : siteName;
  }, [title, siteName]);
}

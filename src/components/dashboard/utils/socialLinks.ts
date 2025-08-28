export const handleSocialLinkClick = (platform: string) => {
  const links = {
    instagram: 'https://www.instagram.com/arcem.assurances/',
    facebook: 'https://www.facebook.com/ARCEMAssurances',
    linkedin: 'https://www.linkedin.com/company/arcem-assurances/'
  };
  
  const url = links[platform as keyof typeof links];
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const handlePostClick = (url: string) => {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
export const getMockAnalysisData = (speechText) => {
  // Analyze speechText to provide more dynamic responses
  const categories = ['Economics', 'Politics', 'Social Issues', 'Technology', 'Environment'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  return {
    category: randomCategory,
    viewpoints: ['Progressive', 'Conservative', 'Libertarian'],
    alternateSpeeches: [
      {
        type: 'Progressive',
        content: 'This issue requires collective action and government intervention to ensure equitable outcomes for all citizens.'
      },
      {
        type: 'Conservative', 
        content: 'Traditional values and free market principles provide the best foundation for addressing this challenge.'
      },
      {
        type: 'Libertarian',
        content: 'Individual liberty and minimal government interference will lead to the most effective solutions.'
      }
    ],
    pros: ['Clear messaging', 'Strong evidence', 'Compelling narrative'],
    cons: ['Limited scope', 'Potential bias', 'Missing counterpoints'],
    politicalImpact: `This speech aligns with ${randomCategory.toLowerCase()} discourse and may influence public opinion.`,
    framingDifferences: [
      { perspective: 'Mainstream Media', framing: 'Citizens engage in important policy debate' },
      { perspective: 'Social Media', framing: 'Another trending political topic' },
      { perspective: 'Academic', framing: 'Research-backed policy discussion' },
      { perspective: 'General Public', framing: 'People talking about stuff that affects us' }
    ]
  };
};
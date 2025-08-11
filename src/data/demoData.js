// Demo conversation data for article page demonstrations
export const demoConversations = [
  // Demo 1: Basic threading example
  {
    id: 'demo-1',
    title: 'GPT Threads Demo: The Food Chain',
    threads: {
      root: {
        id: 'root',
        parentThreadId: null,
        parentHighlightId: null,
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Explain how energy flows through a food chain in a forest ecosystem.',
            timestamp: 1000
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: `Energy flows through a forest food chain in a unidirectional manner, following the laws of thermodynamics. Here's how it works:

## Primary Producers (Level 1)
**Plants and trees** capture solar energy through photosynthesis, converting it into chemical energy stored as glucose and other organic compounds. They form the foundation of the food chain.

## Primary Consumers (Level 2)  
**Herbivores** like deer, rabbits, and insects consume plants, obtaining the chemical energy stored in plant tissues. However, only about 10% of the energy is transferred to this level - the rest is lost as heat through metabolic processes.

## Secondary Consumers (Level 3)
**Carnivores** such as foxes, hawks, and spiders feed on herbivores. Again, only about 10% of the energy from the previous level is transferred up.

## Tertiary Consumers (Level 4)
**Top predators** like wolves, eagles, and large cats occupy the highest trophic level. They receive the least amount of energy, which is why their populations are typically smaller.

## Decomposers
**Bacteria and fungi** break down dead organisms at all levels, recycling nutrients back to the soil for plants to use, completing the cycle.

This energy transfer explains why food chains rarely exceed 4-5 levels - there simply isn't enough energy to support higher levels.`,
            timestamp: 2000
          }
        ],
        highlights: [
          {
            id: 'hl-1',
            messageId: 'msg-2',
            text: 'only about 10% of the energy is transferred to this level',
            threadId: 'thread-1',
            anchor: { start: 890, end: 944 },
            isDraft: false
          },
          {
            id: 'hl-2',
            messageId: 'msg-2',
            text: 'Decomposers**\n**Bacteria and fungi** break down dead organisms',
            threadId: 'thread-2',
            anchor: { start: 1150, end: 1210 },
            isDraft: false
          }
        ]
      },
      'thread-1': {
        id: 'thread-1',
        parentThreadId: 'root',
        parentHighlightId: 'hl-1',
        highlightedText: 'only about 10% of the energy is transferred to this level',
        messages: [
          {
            id: 'msg-3',
            role: 'user',
            content: 'Why is energy transfer so inefficient? What happens to the other 90%?',
            timestamp: 3000
          },
          {
            id: 'msg-4',
            role: 'assistant',
            content: `The low energy transfer efficiency (around 10%) is due to several fundamental biological processes:

## Metabolic Heat Loss
The largest portion of energy is lost as **heat** during cellular respiration. When organisms break down glucose for ATP, most energy is released as thermal energy rather than being captured for biological work.

## Movement and Activity
Organisms expend significant energy on:
- **Locomotion** (running, flying, swimming)
- **Foraging** for food
- **Territory defense** and mating behaviors
- **Maintaining homeostasis** (temperature regulation, etc.)

## Incomplete Consumption
Not all parts of prey are consumed:
- **Bones, shells, and tough plant fibers** are often left behind
- Some prey **escape** predation attempts
- **Seasonal availability** affects feeding efficiency

## Digestion Losses
Even consumed food isn't 100% absorbed:
- **Indigestible matter** passes through as waste
- **Digestive efficiency** varies by species and food type
- Some nutrients are **excreted** before full utilization

## Growth and Reproduction
Energy is diverted to:
- **Cell maintenance** and repair
- **Immune system** function  
- **Reproductive** activities (courtship, egg production, parental care)

This inefficiency is actually crucial for ecosystem stability - it prevents any single species from monopolizing all available energy and maintains biodiversity.`,
            timestamp: 4000
          }
        ],
        highlights: []
      },
      'thread-2': {
        id: 'thread-2',
        parentThreadId: 'root',
        parentHighlightId: 'hl-2',
        highlightedText: 'Decomposers**\n**Bacteria and fungi** break down dead organisms',
        messages: [
          {
            id: 'msg-5',
            role: 'user',
            content: 'How do decomposers actually break down organic matter? What\'s the chemistry behind it?',
            timestamp: 5000
          },
          {
            id: 'msg-6',
            role: 'assistant',
            content: `Decomposers use a sophisticated array of enzymes to break down complex organic molecules into simpler compounds. Here's the chemical process:

## Enzymatic Breakdown

**Cellulases** break down cellulose (plant cell walls):
- Cellulose → Cellobiose → Glucose
- Formula: (C₆H₁₀O₅)ₙ + nH₂O → nC₆H₁₂O₆

**Proteases** decompose proteins:
- Proteins → Peptides → Amino acids  
- Breaking peptide bonds: R-CO-NH-R' + H₂O → R-COOH + NH₂-R'

**Lipases** break down fats:
- Triglycerides → Glycerol + Fatty acids
- Ester bonds are hydrolyzed

## The Decay Process

1. **Autolysis** - Cell's own enzymes begin breakdown after death
2. **Bacterial colonization** - Bacteria multiply and secrete enzymes
3. **Fungal invasion** - Fungi penetrate tissues with hyphal networks
4. **Chemical changes** - pH drops, proteins denature, tissues soften

## Environmental Factors

- **Temperature**: Higher temps accelerate enzyme activity
- **Moisture**: Water needed for hydrolysis reactions  
- **Oxygen**: Aerobic vs anaerobic decomposition pathways
- **pH levels**: Affect enzyme function and microbial growth

The end products (CO₂, NH₃, H₂O, minerals) are then available for plant uptake, completing the nutrient cycle.`,
            timestamp: 6000
          }
        ],
        highlights: []
      }
    },
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000
  },

  // Demo 2: Complex branching conversation
  {
    id: 'demo-2',
    title: 'GPT Threads Demo: Machine Learning Ethics',
    threads: {
      root: {
        id: 'root',
        parentThreadId: null,
        parentHighlightId: null,
        messages: [
          {
            id: 'msg-10',
            role: 'user',
            content: 'What are the main ethical concerns with modern AI and machine learning systems?',
            timestamp: 10000
          },
          {
            id: 'msg-11',
            role: 'assistant',
            content: `Modern AI and ML systems raise several critical ethical concerns:

## Bias and Discrimination
**Algorithmic bias** can perpetuate or amplify existing societal inequalities. Training data often reflects historical biases, leading to discriminatory outcomes in hiring, lending, criminal justice, and healthcare.

## Privacy and Surveillance  
ML systems can **analyze vast amounts of personal data**, enabling unprecedented surveillance capabilities. Facial recognition, behavioral prediction, and data mining raise concerns about individual privacy and autonomy.

## Transparency and Explainability
Many ML models operate as **"black boxes"** - their decision-making processes are opaque even to their creators. This lack of transparency makes it difficult to understand, audit, or contest automated decisions.

## Job Displacement
**Automation** powered by AI threatens to displace workers across many industries, potentially leading to widespread unemployment and economic inequality.

## Autonomy and Human Agency
As AI systems become more sophisticated, there's concern about **over-reliance** on automated decision-making, potentially diminishing human judgment and agency.

## Safety and Reliability
**Unpredictable failures** in AI systems can have serious consequences, especially in critical applications like autonomous vehicles, medical diagnosis, or financial systems.

## Concentration of Power
AI development is dominated by a few large corporations and nations, leading to concerns about **technological monopolies** and geopolitical power imbalances.`,
            timestamp: 11000
          }
        ],
        highlights: [
          {
            id: 'hl-10',
            messageId: 'msg-11',
            text: 'Algorithmic bias** can perpetuate or amplify existing societal inequalities',
            threadId: 'thread-10',
            anchor: { start: 120, end: 185 },
            isDraft: false
          },
          {
            id: 'hl-11',
            messageId: 'msg-11',
            text: 'black boxes"** - their decision-making processes are opaque',
            threadId: 'thread-11',
            anchor: { start: 650, end: 710 },
            isDraft: false
          },
          {
            id: 'hl-12',
            messageId: 'msg-11',
            text: 'Automation** powered by AI threatens to displace workers',
            threadId: 'thread-12',
            anchor: { start: 850, end: 905 },
            isDraft: false
          }
        ]
      },
      'thread-10': {
        id: 'thread-10',
        parentThreadId: 'root',
        parentHighlightId: 'hl-10',
        highlightedText: 'Algorithmic bias** can perpetuate or amplify existing societal inequalities',
        messages: [
          {
            id: 'msg-12',
            role: 'user',
            content: 'Can you give me some concrete examples of algorithmic bias that have occurred in real-world systems?',
            timestamp: 12000
          },
          {
            id: 'msg-13',
            role: 'assistant',
            content: `Here are several documented cases of algorithmic bias in real-world systems:

## Criminal Justice
**COMPAS (Correctional Offender Management Profiling for Alternative Sanctions)**: ProPublica's 2016 investigation found this risk assessment tool was **twice as likely to falsely flag Black defendants as high-risk** compared to white defendants, while incorrectly labeling white defendants as low-risk more often.

## Hiring and Recruitment
**Amazon's AI Recruiting Tool**: Scrapped in 2018 after discovering it **systematically downgraded resumes from women**. The system was trained on 10 years of historical hiring data, which reflected male-dominated hiring patterns in tech.

## Healthcare
**Optum's Healthcare Algorithm**: A study found the algorithm **systematically underestimated healthcare needs of Black patients**. Despite having similar health conditions, Black patients received lower risk scores, affecting their access to care programs.

## Financial Services
**Apple Card Algorithm**: In 2019, the Apple Card faced criticism when it offered **significantly lower credit limits to women** than men with similar financial profiles, including cases where spouses with shared finances received vastly different limits.

## Facial Recognition
**Commercial Recognition Systems**: MIT and Stanford studies showed **higher error rates for darker-skinned individuals**, particularly Black women (up to 35% error rate vs. <1% for light-skinned men).

## Housing
**Facebook's Ad Platform**: HUD filed complaints after finding Facebook's algorithm **excluded certain demographics** from seeing housing ads, violating fair housing laws.

These examples highlight how historical biases in training data perpetuate discrimination at scale.`,
            timestamp: 13000
          }
        ],
        highlights: [
          {
            id: 'hl-13',
            messageId: 'msg-13',
            text: 'twice as likely to falsely flag Black defendants as high-risk',
            threadId: 'thread-13',
            anchor: { start: 280, end: 340 },
            isDraft: false
          }
        ]
      },
      'thread-11': {
        id: 'thread-11',
        parentThreadId: 'root',
        parentHighlightId: 'hl-11',
        highlightedText: 'black boxes"** - their decision-making processes are opaque',
        messages: [
          {
            id: 'msg-14',
            role: 'user',
            content: 'What are some proposed solutions to make AI more explainable and transparent?',
            timestamp: 14000
          },
          {
            id: 'msg-15',
            role: 'assistant',
            content: `Several approaches are being developed to address AI transparency and explainability:

## Technical Solutions

**LIME (Local Interpretable Model-agnostic Explanations)**: Explains individual predictions by learning an interpretable model locally around the prediction.

**SHAP (SHapley Additive exPlanations)**: Uses game theory to assign importance values to each feature for a particular prediction.

**Attention Mechanisms**: In neural networks, attention weights show which parts of the input the model is "focusing on" for decisions.

**Gradient-based Methods**: Visualize which input features most strongly influence the model's output through gradient analysis.

## Regulatory Approaches

**EU's AI Act**: Requires high-risk AI systems to be transparent, traceable, and explainable to users.

**Algorithmic Accountability Act** (proposed US): Would require companies to assess their automated systems for bias and discrimination.

**Right to Explanation**: Some jurisdictions grant individuals the right to understand how automated decisions affecting them were made.

## Design Principles

**Interpretable Models**: Using inherently explainable models (decision trees, linear models) instead of complex neural networks when possible.

**Human-in-the-Loop**: Designing systems that keep humans involved in critical decision points.

**Counterfactual Explanations**: Showing users how the decision would change if certain inputs were different.

## Challenges
- **Trade-off with Performance**: More interpretable models often sacrifice accuracy
- **Complexity of Modern AI**: Deep learning models with millions of parameters resist simple explanations
- **Context Dependency**: What constitutes a "good" explanation varies by domain and user`,
            timestamp: 15000
          }
        ],
        highlights: []
      },
      'thread-12': {
        id: 'thread-12',
        parentThreadId: 'root',
        parentHighlightId: 'hl-12',
        highlightedText: 'Automation** powered by AI threatens to displace workers',
        messages: [
          {
            id: 'msg-16',
            role: 'user',
            content: 'What industries are most at risk from AI automation, and are there any potential solutions to help displaced workers?',
            timestamp: 16000
          },
          {
            id: 'msg-17',
            role: 'assistant',
            content: `AI automation poses varying levels of risk across different industries:

## Highest Risk Industries

**Transportation**: Autonomous vehicles threaten truck drivers, taxi drivers, and delivery workers. The American Trucking Association estimates 3.5 million people work as truck drivers.

**Manufacturing**: Robotic automation and AI-powered quality control are displacing assembly line workers, inspectors, and machine operators.

**Retail**: Self-checkout systems, inventory management AI, and e-commerce automation affect cashiers, stock clerks, and warehouse workers.

**Financial Services**: AI handles loan approvals, fraud detection, and basic customer service, impacting bank tellers, underwriters, and call center staff.

**Customer Service**: Chatbots and virtual assistants are replacing human representatives in many contexts.

## Potential Solutions

**Retraining and Reskilling Programs**:
- **Corporate partnerships** with educational institutions
- **Government-funded** vocational training programs  
- **Industry-specific** certification programs

**Universal Basic Income (UBI)**:
- **Pilot programs** in Finland, Kenya, and Stockton, CA show mixed results
- Provides **safety net** during transition periods
- Controversial due to funding and incentive concerns

**Job Redefinition**:
- **Human-AI collaboration** rather than replacement
- **Upskilling** workers to manage and work alongside AI systems
- **Creating new roles** in AI maintenance, training, and oversight

**Policy Interventions**:
- **Automation taxes** to fund retraining programs
- **Shorter work weeks** to distribute remaining work
- **Investment in human-centric** sectors (healthcare, education, social work)

The key is proactive planning rather than reactive responses to technological displacement.`,
            timestamp: 17000
          }
        ],
        highlights: []
      },
      'thread-13': {
        id: 'thread-13',
        parentThreadId: 'thread-10',
        parentHighlightId: 'hl-13',
        highlightedText: 'twice as likely to falsely flag Black defendants as high-risk',
        messages: [
          {
            id: 'msg-18',
            role: 'user',
            content: 'What steps can be taken to reduce bias in criminal justice AI systems specifically?',
            timestamp: 18000
          },
          {
            id: 'msg-19',
            role: 'assistant',
            content: `Reducing bias in criminal justice AI requires a multi-faceted approach:

## Data Quality Improvements

**Historical Data Auditing**: Review training datasets for embedded biases from past discriminatory practices in policing and sentencing.

**Balanced Datasets**: Ensure representation across demographic groups and geographic regions to avoid skewed outcomes.

**Feature Selection**: Carefully evaluate which variables to include - avoiding proxies for race/ethnicity while maintaining predictive value.

## Algorithmic Fairness Techniques

**Equalized Odds**: Ensure equal true positive and false positive rates across demographic groups.

**Demographic Parity**: Maintain similar prediction rates across protected groups.

**Calibration**: Ensure prediction probabilities are accurate across all demographic groups.

## Validation and Testing

**Bias Testing**: Regular audits using metrics like statistical parity difference and equal opportunity difference.

**Cross-validation**: Test algorithms on diverse populations and scenarios before deployment.

**Continuous Monitoring**: Ongoing assessment of outcomes to detect bias drift over time.

## Governance and Oversight

**Diverse Development Teams**: Include ethicists, civil rights experts, and affected community representatives.

**Transparency Requirements**: Make algorithms auditable by independent researchers and advocacy groups.

**Human Review**: Maintain human oversight for high-stakes decisions, especially in cases where algorithmic confidence is low.

## Legal and Policy Frameworks

**Due Process Protections**: Ensure defendants can understand and challenge algorithmic assessments.

**Regular Recalibration**: Update models to reflect changing social conditions and legal standards.

**Impact Assessments**: Require bias impact studies before deploying new systems.

The goal is not perfect prediction but fair treatment across all demographic groups.`,
            timestamp: 19000
          }
        ],
        highlights: []
      }
    },
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 7200000
  }
];

// Timing data for animated replay
export const animationTimings = {
  'demo-1': [
    { messageId: 'msg-1', delay: 0, typingSpeed: 100 },
    { messageId: 'msg-2', delay: 100, typingSpeed: 100 },
    {
      action: 'highlight',
      highlightId: 'hl-1',
      delay: 50,
      duration: 100
    },
    { messageId: 'msg-3', delay: 100, typingSpeed: 100 },
    { messageId: 'msg-4', delay: 100, typingSpeed: 100 },
    {
      action: 'highlight',
      highlightId: 'hl-2',
      delay: 50,
      duration: 100
    },
    { messageId: 'msg-5', delay: 100, typingSpeed: 100 },
    { messageId: 'msg-6', delay: 100, typingSpeed: 100 }
  ],
  'demo-2': [
    { messageId: 'msg-10', delay: 0, typingSpeed: 100 },
    { messageId: 'msg-11', delay: 100, typingSpeed: 100 },
    {
      action: 'highlight',
      highlightId: 'hl-10',
      delay: 50,
      duration: 100
    },
    { messageId: 'msg-12', delay: 100, typingSpeed: 100 },
    { messageId: 'msg-13', delay: 100, typingSpeed: 100 },
    {
      action: 'highlight',
      highlightId: 'hl-13',
      delay: 50,
      duration: 100
    },
    { messageId: 'msg-18', delay: 100, typingSpeed: 100 },
    { messageId: 'msg-19', delay: 100, typingSpeed: 100 }
  ]
};

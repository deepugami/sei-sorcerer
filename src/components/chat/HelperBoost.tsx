import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleEllipsis,
  CodeIcon,
  Layers,
  PartyPopper,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Drawer } from 'vaul';

interface HelperBoostProps {
  submitQuery?: (query: string) => void;
  setInput?: (value: string) => void;
}

// Query templates for each category
const queryTemplates = {
  WalletAnalysis: 'Analyze wallet sei1... to check balance and ',
  NFTHistory: 'Track NFT contract 0x... and analyze ',
  TransactionExplainer: 'Explain transaction 0x... and decode ',
  BlockchainQuery: 'What is Sei blockchain and how does it ',
};

const questionConfig = [
  { key: 'WalletAnalysis', color: '#329696', icon: Wallet },
  { key: 'NFTHistory', color: '#856ED9', icon: Sparkles },
  { key: 'TransactionExplainer', color: '#B95F9D', icon: CodeIcon },
  { key: 'BlockchainQuery', color: '#C19433', icon: PartyPopper },
];

// Updated drawer questions with templates
const questionsByCategory = [
  {
    id: 'wallet',
    name: 'Wallet Analysis',
    icon: Wallet,
    questions: [
      'Analyze wallet sei1... to check balance and asset composition',
      'Check wallet sei1... holdings and performance',
      'Show trading patterns for wallet sei1...',
      'Evaluate wallet sei1... risk and diversification',
    ],
  },
  {
    id: 'nfts',
    name: 'NFT History',
    icon: Sparkles,
    questions: [
      'Track NFT contract 0x... ownership history',
      'Analyze NFT collection floor price trends',
      'Show NFT rarity and velocity metrics',
      'Monitor NFT market performance',
    ],
  },
  {
    id: 'transactions',
    name: 'Transaction Explainer',
    icon: CodeIcon,
    questions: [
      'Explain transaction 0x... step by step',
      'Decode DeFi transaction 0x... details',
      'Analyze transaction 0x... gas optimization',
      'Assess transaction 0x... security risks',
    ],
  },
  {
    id: 'blockchain',
    name: 'Blockchain Query', 
    icon: PartyPopper,
    questions: [
      'What is Sei blockchain and how does it work for DeFi?',
      'How does Sei compare to other blockchains?',
      'What are the key features of Sei?',
      'How does parallel processing work on Sei?',
    ],
  },
];

// Animated Chevron component
const AnimatedChevron = () => {
  return (
    <motion.div
      animate={{
        y: [0, -4, 0], // Subtle up and down motion
      }}
      transition={{
        duration: 1.5,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'loop',
      }}
      className="text-primary mb-1.5"
    >
      <ChevronUp size={16} />
    </motion.div>
  );
};

export default function HelperBoost({
  submitQuery,
  setInput,
}: HelperBoostProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [open, setOpen] = useState(false);

  const handleQuestionClick = (questionKey: string) => {
    if (setInput) {
      const template = queryTemplates[questionKey as keyof typeof queryTemplates];
      setInput(template);
      
      // Focus on the input field after a short delay
      setTimeout(() => {
        const inputElement = document.querySelector('textarea[placeholder*="Ask"], input[placeholder*="Ask"]') as HTMLElement;
        if (inputElement) {
          inputElement.focus();
          // Set cursor to end of text
          if (inputElement instanceof HTMLTextAreaElement || inputElement instanceof HTMLInputElement) {
            inputElement.setSelectionRange(template.length, template.length);
          }
        }
      }, 100);
    }
  };

  const handleDrawerQuestionClick = (question: string) => {
    if (setInput) {
      setInput(question);
      
      // Focus on the input field after a short delay
      setTimeout(() => {
        const inputElement = document.querySelector('textarea[placeholder*="Ask"], input[placeholder*="Ask"]') as HTMLElement;
        if (inputElement) {
          inputElement.focus();
          // Set cursor to end of text
          if (inputElement instanceof HTMLTextAreaElement || inputElement instanceof HTMLInputElement) {
            inputElement.setSelectionRange(question.length, question.length);
          }
        }
      }, 100);
    }
    setOpen(false);
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <div className="w-full">
          {/* Toggle Button */}
          <div
            className={
              isVisible
                ? 'mb-2 flex justify-center'
                : 'mb-0 flex justify-center'
            }
          >
            <button
              onClick={toggleVisibility}
              className="flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {isVisible ? (
                <>
                  <ChevronDown size={14} />
                  Hide blockchain queries
                </>
              ) : (
                <>
                  <ChevronUp size={14} />
                  Show blockchain queries
                </>
              )}
            </button>
          </div>

          {/* HelperBoost Content */}
          {isVisible && (
            <div className="w-full">
              <div
                className="flex w-full flex-wrap gap-1 md:gap-3"
                style={{ justifyContent: 'safe center' }}
              >
                {questionConfig.map(({ key, color, icon: Icon }) => (
                  <Button
                    key={key}
                    onClick={() => handleQuestionClick(key)}
                    variant="outline"
                    className="border-border hover:bg-border/30 h-auto min-w-[100px] flex-shrink-0 cursor-pointer rounded-xl border bg-background/80 px-4 py-3 shadow-none backdrop-blur-sm transition-none active:scale-95"
                  >
                    <div className="flex items-center gap-3 text-foreground">
                      <Icon size={18} strokeWidth={2} color={color} />
                      <span className="text-sm font-medium">{key}</span>
                    </div>
                  </Button>
                ))}

                {/* Need Inspiration Button */}
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Drawer.Trigger className="group relative flex flex-shrink-0 items-center justify-center">
                        <motion.div
                          className="hover:bg-border/30 flex h-auto cursor-pointer items-center space-x-1 rounded-xl border border-border bg-background/80 px-4 py-3 text-sm backdrop-blur-sm transition-all duration-200"
                          whileHover={{ scale: 1 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3 text-foreground">
                            <CircleEllipsis
                              className="h-[20px] w-[18px]"
                              //style={{ color: '#3B82F6' }}
                              strokeWidth={2}
                            />
                            {/*<span className="text-sm font-medium">More</span>*/}
                          </div>
                        </motion.div>
                      </Drawer.Trigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <AnimatedChevron />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Content */}
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" />
          <Drawer.Content className="fixed right-0 bottom-0 left-0 z-[200] mt-24 flex h-[80%] flex-col rounded-t-[10px] bg-background outline-none lg:h-[60%]">
            <div className="flex-1 overflow-y-auto rounded-t-[10px] bg-background p-4">
              <div className="mx-auto max-w-md space-y-4">
                <div
                  aria-hidden
                  className="mx-auto mb-8 h-1.5 w-12 flex-shrink-0 rounded-full bg-border"
                />
                <div className="mx-auto w-full max-w-md">
                  <div className="space-y-8 pb-16">
                    {questionsByCategory.map((category) => (
                      <CategorySection
                        key={category.id}
                        name={category.name}
                        Icon={category.icon}
                        questions={category.questions}
                        onQuestionClick={handleDrawerQuestionClick}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

// Component for each category section
interface CategorySectionProps {
  name: string;
  Icon: React.ElementType;
  questions: string[];
  onQuestionClick: (question: string) => void;
}

function CategorySection({
  name,
  Icon,
  questions,
  onQuestionClick,
}: CategorySectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 px-1">
        <Icon className="h-5 w-5" />
        <Drawer.Title className="text-[22px] font-medium text-foreground">
          {name}
        </Drawer.Title>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        {questions.map((question, index) => (
          <QuestionItem
            key={index}
            question={question}
            onClick={() => onQuestionClick(question)}
            isSpecial={false}
          />
        ))}
      </div>
    </div>
  );
}

// Component for each question item with animated chevron
interface QuestionItemProps {
  question: string;
  onClick: () => void;
  isSpecial: boolean;
}

function QuestionItem({ question, onClick, isSpecial }: QuestionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className={cn(
        'flex w-full items-center justify-between rounded-[10px]',
        'text-md px-6 py-4 text-left font-normal',
        'transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        isSpecial ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
      )}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        backgroundColor: isSpecial ? undefined : 'hsl(var(--accent) / 0.8)',
      }}
      whileTap={{
        scale: 0.98,
        backgroundColor: isSpecial ? undefined : 'hsl(var(--accent) / 0.6)',
      }}
    >
      <div className="flex items-center">
        {isSpecial && <Sparkles className="mr-2 h-4 w-4 text-primary-foreground" />}
        <span className={isSpecial ? 'font-medium text-primary-foreground' : 'text-accent-foreground'}>
          {question}
        </span>
      </div>
      <motion.div
        animate={{ x: isHovered ? 4 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
      >
        <ChevronRight
          className={cn(
            'h-5 w-5 shrink-0',
            isSpecial ? 'text-primary-foreground' : 'text-foreground'
          )}
        />
      </motion.div>
    </motion.button>
  );
}

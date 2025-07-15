import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import * as React from "react";
import { Button, ButtonProps } from "../button";
import MessageLoading from "./message-loading";

// iOS-style animation variants
const messageAnimationVariants = {
  // Incoming messages slide from left
  receivedInitial: {
    opacity: 0,
    x: -50,
    scale: 0.95,
  },
  receivedAnimate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300,
      mass: 0.8,
      duration: 0.6,
    },
  },
  // Outgoing messages slide from right with bounce
  sentInitial: {
    opacity: 0,
    x: 50,
    scale: 0.9,
  },
  sentAnimate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 280,
      mass: 0.9,
      duration: 0.7,
    },
  },
  // AI messages with special entrance
  aiInitial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  aiAnimate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 22,
      stiffness: 320,
      mass: 0.7,
      duration: 0.5,
    },
  },
};

// ChatBubble
const chatBubbleVariant = cva(
  "flex gap-2 items-start relative group",
  {
    variants: {
      variant: {
        received: "self-start w-full",
        sent: "self-end flex-row-reverse mr-4",
      },
      layout: {
        default: "",
        ai: "max-w-full w-full items-center",
      },
    },
    defaultVariants: {
      variant: "received",
      layout: "default",
    },
  }
);

interface ChatBubbleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chatBubbleVariant> {
  animate?: boolean;
  index?: number;
}

const ChatBubble = React.forwardRef<HTMLDivElement, ChatBubbleProps>(
  ({ className, variant, layout, children, animate = true, index = 0, ...props }, ref) => {
    // Determine animation variant based on message type
    const getAnimationVariant = () => {
      if (!animate) return {};
      
      if (layout === "ai") {
        return {
          initial: "aiInitial",
          animate: "aiAnimate",
          variants: messageAnimationVariants,
        };
      } else if (variant === "sent") {
        return {
          initial: "sentInitial",
          animate: "sentAnimate",
          variants: messageAnimationVariants,
        };
      } else {
        return {
          initial: "receivedInitial",
          animate: "receivedAnimate",
          variants: messageAnimationVariants,
        };
      }
    };

    const animationProps = getAnimationVariant();

    // Add staggered delay for multiple messages
    if (animate && animationProps.variants) {
      const currentVariant = animationProps.variants[animationProps.animate as keyof typeof messageAnimationVariants];
      if (currentVariant && 'transition' in currentVariant && currentVariant.transition && typeof currentVariant.transition === 'object') {
        (currentVariant.transition as any).delay = index * 0.1;
      }
    }

    return (
      <motion.div
        className={cn(
          chatBubbleVariant({ variant, layout, className }),
          "relative group"
        )}
        ref={ref}
        {...animationProps}
        {...(props as any)}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child) && typeof child.type !== "string"
            ? React.cloneElement(child, {
                variant,
                layout,
              } as React.ComponentProps<typeof child.type>)
            : child
        )}
      </motion.div>
    );
  }
);
ChatBubble.displayName = "ChatBubble";

// ChatBubbleAvatar
interface ChatBubbleAvatarProps {
  src?: string;
  fallback?: string;
  className?: string;
  width?: number;
  height?: number;
}

const ChatBubbleAvatar: React.FC<ChatBubbleAvatarProps> = ({
  src,
  fallback,
  className,
  width,
  height,
}) => (
  <Avatar>
    <AvatarImage
      src={src}
      alt="Avatar"
      className={className}
      width={width}
      height={height}
    />
    <AvatarFallback>{fallback}</AvatarFallback>
  </Avatar>
);

// iOS iMessage-style bubble variants - removed shadows, enhanced styling
const chatBubbleMessageVariants = cva("", {
  variants: {
    variant: {
      received:
        "text-secondary-foreground rounded-[18px] py-3 px-4 border-0 backdrop-blur-sm bg-[#E6E6EB]/70 relative before:content-[''] before:absolute before:bottom-[8px] before:-left-[7px] before:w-[8px] before:h-[16px] before:overflow-hidden before:z-[-1] before:bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 8 16%22%3E%3Cpath d=%22M0 16C8 16 8 8 8 8C8 8 8 0 0 0Z%22 fill=%22%23E6E6EB%22 fill-opacity=%220.7%22/%3E%3C/svg%3E')]",
      sent: "px-4 py-3 text-white rounded-[18px] backdrop-blur-sm bg-gradient-to-b from-[#0A84FF] to-[#0078FF] relative after:content-[''] after:absolute after:bottom-[8px] after:-right-[7px] after:w-[8px] after:h-[16px] after:overflow-hidden after:z-[-1] after:bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 8 16%22%3E%3Cpath d=%22M8 16C0 16 0 8 0 8C0 8 0 0 8 0Z%22 fill=%22url(%23grad)%22/%3E%3Cdefs%3E%3ClinearGradient id=%22grad%22 x1=%220%25%22 y1=%220%25%22 x2=%220%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 stop-color=%22%230A84FF%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%230078FF%22/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E')]",
    },
    layout: {
      default: "",
      ai: "border-t w-full rounded-none bg-transparent backdrop-blur-none",
    },
  },
  defaultVariants: {
    variant: "received",
    layout: "default",
  },
});

interface ChatBubbleMessageProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop' | 'onAnimationStart' | 'onAnimationEnd'>,
    VariantProps<typeof chatBubbleMessageVariants> {
  isLoading?: boolean;
  animate?: boolean;
}

const ChatBubbleMessage = React.forwardRef<
  HTMLDivElement,
  ChatBubbleMessageProps
>(
  (
    { className, variant, layout, isLoading = false, animate = true, children, ...props },
    ref
  ) => {
    // iOS-style clean bubbles without shadows
    const parallaxHoverAnimation = {
      y: -1,
      scale: 1.01,
    };

    return (
      <motion.div
        className={cn(
          chatBubbleMessageVariants({ variant, layout, className }),
          "break-words max-w-full whitespace-pre-wrap transition-all duration-200 ios-chat-text"
        )}
        ref={ref}
        whileHover={animate && layout !== "ai" ? parallaxHoverAnimation : {}}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 400,
          duration: 0.2,
        }}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <MessageLoading />
          </div>
        ) : (
          children
        )}
      </motion.div>
    );
  }
);
ChatBubbleMessage.displayName = "ChatBubbleMessage";

// ChatBubbleTimestamp
interface ChatBubbleTimestampProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop' | 'onAnimationStart' | 'onAnimationEnd'> {
  timestamp: string;
}

const ChatBubbleTimestamp: React.FC<ChatBubbleTimestampProps> = ({
  timestamp,
  className,
  ...props
}) => (
  <motion.div 
    className={cn("text-xs mt-2 text-right opacity-60", className)} 
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.6 }}
    transition={{ delay: 0.5, duration: 0.3 }}
    {...props}
  >
    {timestamp}
  </motion.div>
);

// ChatBubbleAction
type ChatBubbleActionProps = ButtonProps & {
  icon: React.ReactNode;
};

const ChatBubbleAction: React.FC<ChatBubbleActionProps> = ({
  icon,
  onClick,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}) => (
  <motion.div
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: "spring", damping: 20, stiffness: 300 }}
  >
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      {...props}
    >
      {icon}
    </Button>
  </motion.div>
);

interface ChatBubbleActionWrapperProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop' | 'onAnimationStart' | 'onAnimationEnd'> {
  variant?: "sent" | "received";
  className?: string;
}

const ChatBubbleActionWrapper = React.forwardRef<
  HTMLDivElement,
  ChatBubbleActionWrapperProps
>(({ variant, className, children, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      "absolute top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200",
      variant === "sent"
        ? "-left-1 -translate-x-full flex-row-reverse"
        : "-right-1 translate-x-full",
      className
    )}
    initial={{ opacity: 0, scale: 0.9 }}
    whileHover={{ opacity: 1, scale: 1 }}
    transition={{ type: "spring", damping: 20, stiffness: 300 }}
    {...props}
  >
    {children}
  </motion.div>
));

ChatBubbleActionWrapper.displayName = "ChatBubbleActionWrapper";

export {
  ChatBubble,
  ChatBubbleAction,
  ChatBubbleActionWrapper,
  ChatBubbleAvatar,
  ChatBubbleMessage,
  ChatBubbleTimestamp,
  type ChatBubbleActionProps,
  type ChatBubbleAvatarProps,
  type ChatBubbleMessageProps,
  type ChatBubbleTimestampProps,
};


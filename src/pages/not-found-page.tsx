import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookX, ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="relative max-w-md text-center">
        {/* Dot pattern background */}
        <div className="absolute inset-0 -z-10 dot-pattern rounded-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="space-y-6 px-8 py-12"
        >
          {/* Large gradient 404 */}
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="gradient-text font-display text-8xl font-bold tracking-tight"
          >
            404
          </motion.p>

          {/* Icon decoration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-50 text-ink-400"
          >
            <BookX className="h-8 w-8" />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <h1 className="font-display text-2xl tracking-tight text-foreground">
              页面不存在
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              你访问的页面可能已被移动或删除，<br />
              请返回首页继续你的创作之旅。
            </p>
          </motion.div>

          {/* Button */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/">
              <Button size="lg" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                返回首页
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

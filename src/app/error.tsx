'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { ScrollArea } from "@/components/ui/scroll-area"; // ADDED: Import ScrollArea

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
     <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle className="text-2xl text-destructive">Oops! Something went wrong.</CardTitle>
                <CardDescription>
                    An unexpected error occurred in the application.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="max-h-48"> {/* ADDED: ScrollArea here */}
                    <p className="text-sm text-muted-foreground mb-4">
                        Error details (for debugging): {error.message}
                        {error.digest && ` (Digest: ${error.digest})`}
                    </p>
                </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
                >
                Try again
                </Button>
            </CardFooter>
        </Card>
    </div>
  )
}


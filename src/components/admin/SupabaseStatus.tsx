import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Database, Wifi, WifiOff, RefreshCw } from 'lucide-react'

export const SupabaseStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const { toast } = useToast()

  const checkConnection = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('count')
        .limit(1)

      if (error) {
        console.error('Supabase connection error:', error)
        setIsConnected(false)
        toast({
          title: "Database Connection Failed",
          description: error.message,
          variant: "destructive",
        })
      } else {
        setIsConnected(true)
        setLastChecked(new Date())
      }
    } catch (error) {
      console.error('Supabase connection error:', error)
      setIsConnected(false)
      toast({
        title: "Database Connection Failed",
        description: "Unable to connect to Supabase",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Database Status
        </CardTitle>
        <CardDescription>
          Supabase connection and health check
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection Status:</span>
          <div className="flex items-center gap-2">
            {isConnected === null ? (
              <Badge variant="outline">Checking...</Badge>
            ) : isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <Badge className="bg-green-500">Connected</Badge>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <Badge variant="destructive">Disconnected</Badge>
              </>
            )}
          </div>
        </div>

        {lastChecked && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Last Checked:</span>
            <span className="text-sm text-muted-foreground">
              {lastChecked.toLocaleTimeString()}
            </span>
          </div>
        )}

        <Button
          onClick={checkConnection}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Connection
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>Environment Variables:</p>
          <ul className="mt-1 space-y-1">
            <li>
              VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
            </li>
            <li>
              VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
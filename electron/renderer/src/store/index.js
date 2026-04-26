import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useAppStore = create(
  devtools(
    persist(
      (set, get) => ({
        serverInfo: null,
        setServerInfo: (info) => set({ serverInfo: info }),
        
        connected: false,
        setConnected: (connected) => set({ connected }),
        
        tasks: [],
        setTasks: (tasks) => set({ tasks }),
        addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
        updateTask: (id, updatedTask) => set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updatedTask } : t))
        })),
        removeTask: (id) => set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id)
        })),
        
        currentTask: null,
        setCurrentTask: (task) => set({ currentTask }),
        
        adapters: [],
        setAdapters: (adapters) => set({ adapters }),
        
        aiProviders: [],
        setAiProviders: (providers) => set({ aiProviders: providers }),
        
        audioDevices: [],
        setAudioDevices: (devices) => set({ audioDevices: devices }),
        
        chatMessages: [],
        setChatMessages: (messages) => set({ chatMessages: messages }),
        addChatMessage: (message) => set((state) => ({ 
          chatMessages: [...state.chatMessages, message] 
        })),
        clearChatMessages: () => set({ chatMessages: [] }),
        
        chatSessionId: null,
        setChatSessionId: (id) => set({ chatSessionId: id }),
        
        config: {
          ai: {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            baseUrl: ''
          },
          audio: {
            outputDevice: '',
            speechRate: 150,
            volume: 1.0,
            bluetoothDevice: ''
          },
          scheduler: {
            maxConcurrentTasks: 5,
            timezone: 'Asia/Shanghai'
          }
        },
        setConfig: (config) => set({ config }),
        updateConfig: (partialConfig) => set((state) => ({
          config: { ...state.config, ...partialConfig }
        })),
        
        notifications: [],
        addNotification: (notification) => set((state) => ({
          notifications: [...state.notifications, { id: Date.now(), ...notification }]
        })),
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id)
        })),
        clearNotifications: () => set({ notifications: [] }),
        
        isLoading: false,
        setIsLoading: (loading) => set({ isLoading: loading }),
        
        currentPage: 'dashboard',
        setCurrentPage: (page) => set({ currentPage: page }),
        
        sidebarCollapsed: false,
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      }),
      {
        name: 'smart-scheduler-storage',
        partialize: (state) => ({
          config: state.config,
          chatSessionId: state.chatSessionId,
        }),
      }
    )
  )
);

export { useAppStore };

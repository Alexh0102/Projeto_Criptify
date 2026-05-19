import { CheckCircle2, Download, PlusSquare, Share2, Smartphone, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptChoice = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptChoice>
}

type Platform = 'android' | 'ios' | 'other'

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone) ||
    document.referrer.startsWith('android-app://')
  )
}

function detectPlatform(userAgent: string): Platform {
  if (/android/i.test(userAgent)) {
    return 'android'
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'ios'
  }

  return 'other'
}

function isSafariBrowser(userAgent: string) {
  return /safari/i.test(userAgent) && !/crios|fxios|edgios|chrome|android/i.test(userAgent)
}

function getBrowserProfile() {
  if (typeof window === 'undefined') {
    return {
      platform: 'other' as Platform,
      isSafari: false,
    }
  }

  const userAgent = window.navigator.userAgent

  return {
    platform: detectPlatform(userAgent),
    isSafari: isSafariBrowser(userAgent),
  }
}

export default function InstallAppButton() {
  const browserProfile = getBrowserProfile()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallSheetOpen, setIsInstallSheetOpen] = useState(false)
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode)
  const [platform] = useState<Platform>(browserProfile.platform)
  const [isSafari] = useState(browserProfile.isSafari)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setDeferredPrompt(null)
      setIsInstalled(true)
      setIsInstallSheetOpen(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!isInstallSheetOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsInstallSheetOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isInstallSheetOpen])

  const instructions = useMemo(() => {
    if (isInstalled) {
      return {
        eyebrow: 'Pronto',
        title: 'Aplicativo instalado',
        description: 'O CriptoVéu já pode abrir como app na sua tela inicial.',
        steps: [
          'Abra o ícone salvo no celular para entrar direto no modo app.',
          'Se quiser atualizar o atalho, remova o antigo e instale novamente.',
        ],
      }
    }

    if (platform === 'ios') {
      if (!isSafari) {
        return {
          eyebrow: 'iPhone e iPad',
          title: 'Instale pelo Safari',
          description: 'No iPhone, a instalação do app fica mais confiável quando você abre este site no Safari.',
          steps: [
            'Abra o site no Safari.',
            'Toque em Compartilhar.',
            'Escolha Adicionar à Tela de Início.',
          ],
        }
      }

      return {
        eyebrow: 'iPhone e iPad',
        title: 'Adicionar à Tela de Início',
        description: 'No iPhone, a instalação acontece pelo menu de compartilhamento do Safari.',
        steps: [
          'Toque em Compartilhar na barra do Safari.',
          'Role as opções e escolha Adicionar à Tela de Início.',
          'Confirme para abrir o CriptoVéu em modo app.',
        ],
      }
    }

    if (platform === 'android') {
      return {
        eyebrow: 'Android',
        title: deferredPrompt ? 'Instale com um toque' : 'Baixar aplicativo',
        description: deferredPrompt
          ? 'Seu navegador já permite instalar o CriptoVéu como aplicativo.'
          : 'Se o aviso automático não aparecer, você ainda pode instalar pelo menu do navegador.',
        steps: deferredPrompt
          ? [
              'Toque em Instalar agora.',
              'Confirme a instalação no navegador.',
              'Abra o app pela tela inicial do celular.',
            ]
          : [
              'Abra o menu do navegador.',
              'Toque em Instalar app ou Adicionar à tela inicial.',
              'Confirme para salvar o CriptoVéu como aplicativo.',
            ],
      }
    }

    return {
      eyebrow: 'Navegador',
      title: 'Baixar aplicativo',
      description: 'Em celulares compatíveis, você pode instalar o CriptoVéu para abrir mais rápido e sem barra do navegador.',
      steps: [
        'No celular, abra o menu do navegador.',
        'Procure por Instalar app ou Adicionar à tela inicial.',
        'Se estiver no iPhone, use o Safari e toque em Compartilhar.',
      ],
    }
  }, [deferredPrompt, isInstalled, isSafari, platform])

  async function handleInstallNow() {
    if (!deferredPrompt) {
      setIsInstallSheetOpen(true)
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)

    if (choice.outcome === 'accepted') {
      setIsInstallSheetOpen(false)
    }
  }

  async function handlePrimaryClick() {
    if (isInstalled) {
      setIsInstallSheetOpen(true)
      return
    }

    if (deferredPrompt) {
      await handleInstallNow()
      return
    }

    setIsInstallSheetOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void handlePrimaryClick()
        }}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-3 py-2.5 text-sm font-semibold transition duration-200 sm:px-4 ${
          isInstalled
            ? 'border-emerald-400/30 bg-emerald-500/12 text-emerald-50 shadow-[0_14px_30px_rgba(16,185,129,0.14)]'
            : 'border-cyan-400/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(14,227,141,0.14))] text-cyan-50 shadow-[0_18px_42px_rgba(34,211,238,0.14)] hover:-translate-y-0.5 hover:border-cyan-300/40 hover:shadow-[0_22px_48px_rgba(34,211,238,0.18)]'
        }`}
        aria-label={isInstalled ? 'Aplicativo instalado' : 'Baixar aplicativo'}
      >
        {isInstalled ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        <span className="hidden min-[360px]:inline">{isInstalled ? 'Instalado' : 'Baixar app'}</span>
      </button>

      {isInstallSheetOpen ? (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
          <button
            type="button"
            className="absolute inset-0 bg-black/65"
            aria-label="Fechar ajuda de instalação"
            onClick={() => setIsInstallSheetOpen(false)}
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] border border-white/10 bg-zinc-950/95 p-4 backdrop-blur-xl sm:inset-y-6 sm:left-1/2 sm:w-full sm:max-w-[520px] sm:-translate-x-1/2 sm:rounded-[32px] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/80">{instructions.eyebrow}</p>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">{instructions.title}</h2>
                <p className="mt-2 max-w-[42ch] text-sm leading-6 text-zinc-300">{instructions.description}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsInstallSheetOpen(false)}
                className="btn-secondary h-10 w-10 shrink-0 rounded-full px-0 py-0 sm:h-11 sm:w-11"
                aria-label="Fechar ajuda"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {instructions.steps.map((step, index) => (
                <div
                  key={step}
                  className="surface-technical rounded-[22px] border border-white/10 px-4 py-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100">
                      {index === 0 ? (
                        <Smartphone className="h-4 w-4" />
                      ) : index === 1 ? (
                        <Share2 className="h-4 w-4" />
                      ) : (
                        <PlusSquare className="h-4 w-4" />
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">Passo {index + 1}</p>
                      <p className="mt-1.5 text-sm leading-6 text-zinc-200">{step}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {deferredPrompt && !isInstalled ? (
                <button type="button" onClick={() => void handleInstallNow()} className="btn-primary">
                  Instalar agora
                </button>
              ) : null}

              <button type="button" onClick={() => setIsInstallSheetOpen(false)} className="btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

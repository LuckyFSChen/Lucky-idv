import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import ProjectImageCarousel from '@/components/ProjectImageCarousel.vue'
import { useLocaleStore, type Locale } from '@/stores/locale'
import { uiText } from '@/i18n/ui'

const images = ['/uploads/project-one.jpg', '/uploads/project-two.png', '/uploads/project-three.webp']
const wrappers: ReturnType<typeof mount>[] = []

function render(items = images, locale: Locale = 'zh') {
  const pinia = createPinia()
  useLocaleStore(pinia).set(locale)
  const wrapper = mount(ProjectImageCarousel, {
    props: { images: items, alt: 'TaskFlow', placeholder: 'TF' },
    global: { plugins: [pinia] },
  })
  wrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  localStorage.clear()
})

describe('ProjectImageCarousel', () => {
  it('cycles forward and backward through three images', async () => {
    const wrapper = render()
    const previous = wrapper.get('button[aria-label="上一張圖片"]')
    const next = wrapper.get('button[aria-label="下一張圖片"]')
    const expectSlide = (index: number) => {
      expect(wrapper.get('.project-carousel__track').attributes('style')).toContain(`translateX(-${index * 100}%)`)
      expect(wrapper.findAll('img').map(img => img.attributes('aria-hidden')))
        .toEqual(images.map((_, i) => String(i !== index)))
    }
    expectSlide(0)
    await next.trigger('click')
    expectSlide(1)
    await previous.trigger('click')
    expectSlide(0)
    await previous.trigger('click')
    expectSlide(2)
    await next.trigger('click')
    expectSlide(0)
  })

  it('jumps to a dot and marks only the current dot active', async () => {
    const wrapper = render()
    const dots = wrapper.findAll('.project-carousel__dot')
    expect(dots).toHaveLength(3)
    await dots[2]!.trigger('click')
    expect(wrapper.get('.project-carousel__track').attributes('style')).toContain('translateX(-200%)')
    expect(dots.map(dot => dot.classes().includes('active'))).toEqual([false, false, true])
    expect(dots.map(dot => dot.attributes('aria-current'))).toEqual([undefined, undefined, 'true'])
    expect(dots[2]!.attributes('aria-label')).toBe(uiText.zh.projects.imageNavigation.replace('{index}', '3'))
  })

  it('supports left and right arrow keys', async () => {
    const wrapper = render()
    await wrapper.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.get('.project-carousel__dot.active').attributes('aria-label'))
      .toBe(uiText.zh.projects.imageNavigation.replace('{index}', '3'))
    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('.project-carousel__track').attributes('style')).toContain('translateX(-0%)')
  })

  it('shows one image with alt text and no controls', () => {
    const wrapper = render(images.slice(0, 1))
    expect(wrapper.findAll('img')).toHaveLength(1)
    expect(wrapper.get('img').attributes('alt')).toBe(uiText.zh.projects.imageAlt.replace('{name}', 'TaskFlow').replace('{index}', '1'))
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(wrapper.find('.project-carousel__dots').exists()).toBe(false)
  })

  it('shows the placeholder with no images or controls', () => {
    const wrapper = render([])
    expect(wrapper.get('.project-carousel__placeholder').text()).toBe('TF')
    expect(wrapper.findAll('img')).toHaveLength(0)
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('resets to the first image when the image list changes', async () => {
    const wrapper = render()
    await wrapper.findAll('.project-carousel__dot')[2]!.trigger('click')
    await wrapper.setProps({ images: images.slice(0, 1) })
    expect(wrapper.get('.project-carousel__track').attributes('style')).toContain('translateX(-0%)')
    expect(wrapper.get('img').attributes('aria-hidden')).toBe('false')
  })

  it('provides English navigation and image labels', () => {
    const wrapper = render(images, 'en')
    expect(wrapper.get('.project-carousel__arrow--previous').attributes('aria-label')).toBe(uiText.en.projects.previousImage)
    expect(wrapper.get('.project-carousel__arrow--next').attributes('aria-label')).toBe(uiText.en.projects.nextImage)
    expect(wrapper.get('img').attributes('alt')).toBe(uiText.en.projects.imageAlt.replace('{name}', 'TaskFlow').replace('{index}', '1'))
  })
})

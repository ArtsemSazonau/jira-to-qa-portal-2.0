import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NotWiredBadge, PendingAction, SampleDataNotice } from './NotWired'

describe('not-wired markers', () => {
  it('[SET-007] marks a section in words, not only by colour', () => {
    render(<NotWiredBadge />)

    expect(screen.getByText('Not wired yet')).toBeVisible()
  })

  it('[SET-007] shows a sample-data notice as visible text', () => {
    render(<SampleDataNotice>Sample data.</SampleDataNotice>)

    expect(screen.getByText('Sample data.')).toBeVisible()
  })

  it('[SET-008] renders a pending action as a disabled button described by its reason', () => {
    render(<PendingAction id="act" label="Do it" reason="Not wired yet." />)

    const button = screen.getByRole('button', { name: 'Do it' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Not wired yet.')
  })
})

import { test, expect } from '@playwright/test';

test.describe('NPS survey flow', () => {
  test('rate → comment → results, then restart', async ({ page }) => {
    await page.goto('/');

    // Page 1: rating
    await expect(
      page.getByRole('heading', { name: /How likely are you to recommend/i }),
    ).toBeVisible();
    // All 11 buttons (0–10) are present.
    for (let n = 0; n <= 10; n++) {
      await expect(page.getByRole('button', { name: `Rate ${n} out of 10` })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Rate 9 out of 10' }).click();

    // Page 2: comment
    await expect(page.getByText('You rated us')).toContainText('9');
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();
    // Unique per run so it can't collide with other responses (retry-safe).
    const comment = `The mentors were fantastic — ${crypto.randomUUID()}`;
    await page.getByRole('textbox').fill(comment);
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    // Page 3: results
    await expect(page.getByText('Net Promoter Score')).toBeVisible();
    await expect(page.getByText('You', { exact: true })).toBeVisible();
    await expect(page.getByText(comment)).toBeVisible();

    // Restart returns to page 1
    await page.getByRole('button', { name: 'Submit another response' }).click();
    await expect(
      page.getByRole('heading', { name: /How likely are you to recommend/i }),
    ).toBeVisible();
  });

  test('skip the comment still reaches results', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Rate 4 out of 10' }).click();
    await page.getByRole('button', { name: 'Skip this question' }).click();
    await expect(page.getByText('Net Promoter Score')).toBeVisible();
    // Our just-submitted detractor response is flagged as "You".
    await expect(page.getByText('You', { exact: true })).toBeVisible();
  });

  test('back from comment returns to rating', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Rate 7 out of 10' }).click();
    await expect(page.getByText('You rated us')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(
      page.getByRole('heading', { name: /How likely are you to recommend/i }),
    ).toBeVisible();
  });

  test('works on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    // The 0–10 scale stays on a single row on mobile.
    const zero = page.getByRole('button', { name: 'Rate 0 out of 10' });
    const ten = page.getByRole('button', { name: 'Rate 10 out of 10' });
    const zeroBox = await zero.boundingBox();
    const tenBox = await ten.boundingBox();
    expect(zeroBox).not.toBeNull();
    expect(tenBox).not.toBeNull();
    // Same row → roughly equal y position.
    expect(Math.abs((zeroBox!.y) - (tenBox!.y))).toBeLessThan(4);

    await page.getByRole('button', { name: 'Rate 10 out of 10' }).click();
    await expect(page.getByText('You rated us')).toContainText('10');
  });
});

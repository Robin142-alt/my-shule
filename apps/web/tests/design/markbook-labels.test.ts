import {markbookPaperLabel} from '@/lib/modules/markbook-labels';

it.each(['CHEMISTRY Main Paper','chemistry main paper','Main Paper',' CHEMISTRY '])('suppresses the generated label %s',paper=>{
  expect(markbookPaperLabel('CHEMISTRY',paper)).toBe('');
});
it('hides a single assessment without mutating names and retains explicitly configured multiple papers',()=>{
  expect(markbookPaperLabel('Biology','Paper 1',1)).toBe('');
  expect(markbookPaperLabel('Biology','Biology Paper 1',2)).toBe('Paper 1');
  expect(markbookPaperLabel('Biology','Practical',2)).toBe('Practical');
  expect(markbookPaperLabel('Math','Mathematics Paper 1',2)).toBe('Mathematics Paper 1');
});

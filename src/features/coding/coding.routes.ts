import { Router } from 'express';
import { prisma } from '../../database';
import { addOrUpdatePlatformUsername, ingestCodingForStudent } from './services/codingService';
import { generateCodingRecommendations, generateCodingPlanner } from './services/codingAI';

const router = Router();

router.get('/:id/mappings', async (req, res): Promise<void> => {
  try {
    const id = req.params.id as string;
    const mappings = await prisma.platformUsername.findMany({ where: { studentId: id } });
    res.json(mappings);
  } catch (error) {
    console.error('Error fetching mappings:', error);
    res.status(500).json({ error: 'Failed to fetch mappings' });
  }
});

router.post('/:id/mapping', async (req, res): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { platform, username } = req.body;
    if (!platform || !username) {
      res.status(400).json({ error: 'Missing platform or username' });
      return;
    }

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    await addOrUpdatePlatformUsername({ email: student.email, platform, username });
    
    // Trigger immediate ingest so dashboard updates quickly
    await ingestCodingForStudent({ email: student.email, platform, username });

    res.json({ success: true, platform, username });
  } catch (error) {
    console.error('Error linking platform:', error);
    res.status(500).json({ error: 'Failed to link platform' });
  }
});

router.post('/:id/recommendations', async (req, res): Promise<void> => {
  try {
    const id = req.params.id as string;
    const recommendations = await generateCodingRecommendations(id);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

router.post('/:id/goal', async (req, res): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { weeklyTarget } = req.body;
    
    if (typeof weeklyTarget !== 'number') {
      res.status(400).json({ error: 'Invalid weekly target' });
      return;
    }

    const existing = await prisma.studentGoal.findUnique({ where: { studentId: id } });
    if (existing) {
      await prisma.studentGoal.update({ where: { id: existing.id }, data: { weeklyTarget } });
    } else {
      await prisma.studentGoal.create({ data: { studentId: id, weeklyTarget } });
    }
    
    res.json({ success: true, weeklyTarget });
  } catch (error) {
    console.error('Error setting goal:', error);
    res.status(500).json({ error: 'Failed to set goal' });
  }
});

router.post('/:id/plan', async (req, res): Promise<void> => {
  try {
    const id = req.params.id as string;
    const plan = await generateCodingPlanner(id);
    res.json(plan);
  } catch (error) {
    console.error('Error generating coding plan:', error);
    res.status(500).json({ error: 'Failed to generate coding plan' });
  }
});

router.get('/:id/plan', async (req, res): Promise<void> => {
  try {
    const id = req.params.id as string;
    const plan = await prisma.studyPlan.findFirst({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(plan);
  } catch (error) {
    console.error('Error fetching coding plan:', error);
    res.status(500).json({ error: 'Failed to fetch coding plan' });
  }
});

export default router;

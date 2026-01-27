import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function test() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects';
  await mongoose.connect(mongoUri);

  const user = await mongoose.connection.db.collection('users').findOne({ email: 'admin@admin.com' });
  const project = await mongoose.connection.db.collection('projects').findOne({});

  if (!user) {
    console.error('No user found with email admin@admin.com');
    await mongoose.disconnect();
    return;
  }

  if (!project) {
    console.error('No project found');
    await mongoose.disconnect();
    return;
  }

  console.log('Using user:', user.email);
  console.log('Using project:', project.name || project._id);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET not found in environment');
    await mongoose.disconnect();
    return;
  }

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },
    jwtSecret,
    { expiresIn: '1h' }
  );

  // Get audit log count before
  const countBefore = await mongoose.connection.db.collection('auditlogs').countDocuments({});
  console.log('Audit logs before:', countBefore);

  // Test 1: Create a task via API
  console.log('\n=== Test 1: Create Task ===');
  const createResponse = await fetch('http://localhost:3000/api/tasks', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      projectId: project._id.toString(),
      title: 'Audit Test Task ' + Date.now(),
      description: 'Testing audit logging'
    })
  });

  const createData = await createResponse.json();
  console.log('Create task:', createData.success ? 'SUCCESS' : 'FAILED');

  let taskId = null;
  if (createData.data && createData.data.task) {
    taskId = createData.data.task.id;
    console.log('Task ID:', taskId);
  } else {
    console.log('Error:', createData.message || JSON.stringify(createData));
  }

  // Test 2: Update the task
  if (taskId) {
    console.log('\n=== Test 2: Update Task ===');
    const updateResponse = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Updated Audit Test Task',
        status: 'in_review'
      })
    });

    const updateData = await updateResponse.json();
    console.log('Update task:', updateData.success ? 'SUCCESS' : 'FAILED');
    if (!updateData.success) {
      console.log('Update error:', updateData.message || JSON.stringify(updateData));
    }
  }

  // Test 3: Delete the task
  if (taskId) {
    console.log('\n=== Test 3: Delete Task ===');
    const deleteResponse = await fetch(`http://localhost:3000/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    const deleteData = await deleteResponse.json();
    console.log('Delete task:', deleteData.success ? 'SUCCESS' : 'FAILED');
  }

  // Get audit log count after
  const countAfter = await mongoose.connection.db.collection('auditlogs').countDocuments({});
  console.log('\n=== Results ===');
  console.log('Audit logs before:', countBefore);
  console.log('Audit logs after:', countAfter);
  console.log('New logs created:', countAfter - countBefore);

  // Show the new audit logs
  if (countAfter > countBefore) {
    console.log('\nNew audit logs:');
    const newLogs = await mongoose.connection.db.collection('auditlogs')
      .find({})
      .sort({ createdAt: -1 })
      .limit(countAfter - countBefore)
      .toArray();

    newLogs.reverse().forEach((log, i) => {
      console.log(`  ${i + 1}. ${log.action} ${log.resource.type} - "${log.resource.name}" by ${log.actor.name}`);
      if (log.changes && log.changes.length > 0) {
        log.changes.forEach(c => {
          console.log(`     Changed ${c.field}: "${c.oldValue}" -> "${c.newValue}"`);
        });
      }
    });
  }

  await mongoose.disconnect();
}

test().catch(console.error);

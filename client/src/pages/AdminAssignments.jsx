import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Loading from '../components/UI/Loading';
import Toast from '../components/UI/Toast';
import Badge from '../components/UI/Badge';

const AdminAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ exam_id: '', teacher_id: '', notes: '' });
  const [error, setError] = useState('');
  const [exams, setExams] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assignments');
      setAssignments(res.data.assignments || []);
    } catch (err) {
      setError('Lỗi tải danh sách phân công');
    }
    setLoading(false);
  };

  const fetchExams = async () => {
    try {
      const res = await api.get('/exams');
      setExams(res.data.exams || []);
    } catch {}
  };

  const fetchTeachers = async (exam_id) => {
    try {
      const res = await api.get('/assignments/available/teachers', { params: { exam_id } });
      setTeachers(res.data.teachers || []);
    } catch {}
  };

  useEffect(() => { fetchAssignments(); fetchExams(); }, []);

  const openModal = (assignment = null) => {
    setEditing(assignment);
    setForm(assignment ? { ...assignment } : { exam_id: '', teacher_id: '', notes: '' });
    setShowModal(true);
    if (!assignment) setTeachers([]);
    if (assignment && assignment.exam_id) fetchTeachers(assignment.exam_id);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setError(''); };
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'exam_id') fetchTeachers(e.target.value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/assignments/${editing.id}`, form);
      } else {
        await api.post('/assignments', form);
      }
      fetchAssignments();
      closeModal();
    } catch (err) {
      setError('Lỗi lưu phân công');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Xác nhận xóa phân công?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      fetchAssignments();
    } catch (err) {
      setError('Lỗi xóa phân công');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quản lý phân công giáo viên</h2>
      <Button onClick={() => openModal()}>Thêm phân công</Button>
      {loading ? <Loading /> : (
        <table className="w-full border">
          <thead>
            <tr>
              <th>Kỳ thi</th><th>Giáo viên</th><th>Người phân công</th><th>Ghi chú</th><th>Trạng thái</th><th>Thời gian</th><th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => (
              <tr key={a.id} className="border-t">
                <td>{a.exam_name} ({a.subject_code})</td>
                <td>{a.teacher_name}</td>
                <td>{a.assigned_by_name}</td>
                <td>{a.notes}</td>
                <td><Badge status={a.status}>{a.status}</Badge></td>
                <td>{a.assigned_at && a.assigned_at.slice(0, 19).replace('T', ' ')}</td>
                <td>
                  <Button onClick={() => openModal(a)}>Sửa</Button>
                  <Button onClick={() => handleDelete(a.id)} variant="danger">Xóa</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? 'Sửa phân công' : 'Thêm phân công'}
        onSubmit={handleSubmit}
        submitText="Lưu"
        cancelText="Hủy"
      >
        <div className="grid gap-2">
          <select className="border p-2 w-full mb-2" name="exam_id" value={form.exam_id} onChange={handleChange} required disabled={!!editing}>
            <option value="">-- Chọn kỳ thi --</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.name} ({e.subject_code})</option>)}
          </select>
          <select className="border p-2 w-full mb-2" name="teacher_id" value={form.teacher_id} onChange={handleChange} required>
            <option value="">-- Chọn giáo viên --</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <input className="border p-2 w-full mb-2" name="notes" placeholder="Ghi chú" value={form.notes} onChange={handleChange} />
          {error && <Toast message={error} type="error" />}
        </div>
      </Modal>
    </div>
  );
};

export default AdminAssignments; 
import { supabase } from '$lib/supabase';

const BUCKET = 'uploads';

async function currentUserId(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}

// Bild im Browser verkleinern + als JPEG komprimieren, um Speicher/Traffic zu
// sparen. GIF/SVG werden unveraendert gelassen (Animation/Vektor erhalten).
async function compressImage(file: File, maxSize = 1200, quality = 0.82): Promise<Blob> {
	if (!file.type.startsWith('image/')) throw new Error('Bitte eine Bilddatei wählen.');
	if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

	const dataUrl: string = await new Promise((res, rej) => {
		const r = new FileReader();
		r.onload = () => res(r.result as string);
		r.onerror = () => rej(new Error('Datei konnte nicht gelesen werden.'));
		r.readAsDataURL(file);
	});
	const img: HTMLImageElement = await new Promise((res, rej) => {
		const im = new Image();
		im.onload = () => res(im);
		im.onerror = () => rej(new Error('Bild konnte nicht geladen werden.'));
		im.src = dataUrl;
	});

	let w = img.naturalWidth || img.width;
	let h = img.naturalHeight || img.height;
	if (Math.max(w, h) > maxSize) {
		const scale = maxSize / Math.max(w, h);
		w = Math.round(w * scale);
		h = Math.round(h * scale);
	}
	const canvas = document.createElement('canvas');
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext('2d');
	if (!ctx) return file;
	ctx.drawImage(img, 0, 0, w, h);
	const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
	return blob ?? file;
}

// Datei hochladen -> gibt die oeffentliche URL zurueck (fuer image_url/cover_url).
export async function uploadImage(file: File, folder: string): Promise<string> {
	const uid = await currentUserId();
	const blob = await compressImage(file);
	const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'img').toLowerCase();
	const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '') || 'misc';
	const path = `${uid}/${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
	const { error } = await supabase().storage.from(BUCKET).upload(path, blob, {
		contentType: blob.type || 'image/jpeg',
		upsert: false
	});
	if (error) throw new Error(error.message);
	const { data } = supabase().storage.from(BUCKET).getPublicUrl(path);
	return data.publicUrl;
}

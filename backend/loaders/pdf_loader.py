from unstructured.partition.pdf import partition_pdf


def load(file_path: str):
    """Partition a PDF into unstructured elements."""
    return partition_pdf(
        filename=file_path,
        strategy="hi_res",
        infer_table_structure=True,
        extract_image_block_types=["Image"],
        extract_image_block_to_payload=True,
    )
